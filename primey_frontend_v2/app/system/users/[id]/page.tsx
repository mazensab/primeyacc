"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarDays,
  Copy,
  FileText,
  Mail,
  Phone,
  Printer,
  RefreshCw,
  ShieldCheck,
  TableProperties,
  UserRound,
  UsersRound,
  Pencil,
  Save,
  Loader2,
  UserCheck,
  UserX,
  Ban,
} from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  registerBrandButtonClass,
  registerOutlineButtonClass,
} from "@/components/ui/data-register";
import { DataRegisterTableFrame } from "@/components/ui/data-register-table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { SystemMetricCard } from "@/components/ui/system-metric-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import {
  openPrintTableReport,
  type PrintReportTableSection,
} from "@/lib/print-report";
import {
  changeSystemUserStatus,
  fetchSystemUserDetail,
  updateSystemUser,
  SystemUserRoleBadge,
  SystemUserStatusBadge,
  systemUserAccessLabel,
  systemUserRoleLabel,
  systemUserStatusLabel,
  type SystemUserCreateRole,
  type SystemUserRecord,
  type SystemUserStatusAction,
} from "@/lib/system-users";
import {
  formatDateTime,
  formatInteger,
  readSystemLocale,
  type SystemLocale,
} from "@/lib/system-subscriptions";

const translations = {
  ar: {
    title: "تفاصيل مستخدم النظام",
    profileTitle: "الملف التعريفي",
    profileSubtitle: "بياناتك الشخصية ووسائل التواصل وعضوياتك في منصة Mhamcloud.",
    profileEditTitle: "تعديل بياناتي",
    profileEditDesc: "حدّث اسمك وبيانات التواصل. إعدادات الدور والصلاحيات تبقى ضمن إدارة النظام.",
    memberSince: "عضو منذ",
    subtitle:
      "ملف المستخدم وبيانات الوصول والعضويات والصلاحيات المسجلة في منصة Mhamcloud.",
    back: "العودة لمستخدمي النظام",
    refresh: "تحديث",
    print: "طباعة",
    copyId: "نسخ المعرف",
    copied: "تم نسخ معرف المستخدم.",
    userId: "معرف المستخدم",
    status: "الحالة",
    role: "الدور",
    memberships: "العضويات",
    liveRecord: "من السجل الحالي",
    identityTitle: "بيانات المستخدم",
    identityDesc: "الاسم واسم الدخول والبريد ووسائل التواصل.",
    accessTitle: "الوصول والصلاحيات",
    accessDesc: "نوع الوصول والدور والصلاحيات المسجلة للمستخدم.",
    lifecycleTitle: "السجل التشغيلي",
    lifecycleDesc: "تواريخ الإنشاء وآخر ظهور والتعليق وآخر تحديث.",
    membershipsTitle: "عضويات الشركات",
    membershipsDesc:
      "العضويات المرتبطة بالمستخدم؛ اضغط على الصف لفتح الشركة المرتبطة.",
    displayName: "الاسم",
    username: "اسم المستخدم",
    email: "البريد الإلكتروني",
    phone: "الهاتف",
    mobile: "الجوال",
    whatsapp: "واتساب",
    profileId: "معرف الملف",
    accessType: "نوع الوصول",
    workspace: "مساحة العمل الافتراضية",
    systemRole: "دور النظام",
    rawSystemRole: "الدور الخام",
    staff: "موظف Django",
    superuser: "Superuser",
    systemUser: "مستخدم نظام",
    canAccessSystem: "يملك وصول النظام",
    defaultCompany: "الشركة الافتراضية",
    permissionsTitle: "صلاحيات النظام",
    noPermissions: "لا توجد صلاحيات نظام إضافية مسجلة.",
    createdAt: "تاريخ الإنشاء",
    updatedAt: "آخر تحديث",
    lastSeenAt: "آخر ظهور",
    suspendedAt: "تاريخ الإيقاف",
    suspendedReason: "سبب الإيقاف",
    company: "الشركة",
    membershipRole: "دور العضوية",
    membershipStatus: "حالة العضوية",
    primary: "أساسية",
    jobTitle: "المسمى الوظيفي",
    department: "القسم",
    joinedAt: "تاريخ الانضمام",
    yes: "نعم",
    no: "لا",
    noMemberships: "لا توجد عضويات شركات مرتبطة بهذا المستخدم.",
    error: "تعذر تحميل تفاصيل المستخدم",
    retry: "إعادة المحاولة",
    refreshed: "تم تحديث تفاصيل المستخدم.",
    edit: "تعديل المستخدم",
    accountActionsTitle: "إدارة حساب النظام",
    accountActionsDesc:
      "تعديل البيانات المسموحة أو تغيير حالة حساب النظام مع تطبيق حواجز الأمان من الخادم.",
    editTitle: "تعديل بيانات المستخدم",
    editDesc:
      "يمكن تعديل بيانات الهوية ودور النظام فقط. اسم المستخدم وكلمة المرور وصلاحيات Django غير قابلة للتعديل هنا.",
    firstName: "الاسم الأول",
    lastName: "اسم العائلة",
    saveChanges: "حفظ التعديلات",
    cancelEdit: "إلغاء",
    saved: "تم حفظ تعديلات المستخدم.",
    activate: "تفعيل",
    suspend: "تعليق",
    deactivate: "تعطيل",
    confirmStatusTitle: "تأكيد تغيير حالة المستخدم",
    confirmStatusDesc:
      "سيتم تطبيق هذا الإجراء على حساب النظام بالكامل، وليس على عضوية شركة واحدة.",
    reason: "سبب الإجراء",
    reasonPlaceholder: "اكتب سبب التعليق أو التعطيل...",
    reasonRequired: "السبب مطلوب عند التعليق أو التعطيل.",
    statusUpdated: "تم تحديث حالة المستخدم.",
    selfProtection:
      "لا يمكن تعليق أو تعطيل الحساب الذي تستخدمه حاليًا.",
    immutableNotice:
      "اسم المستخدم وكلمة المرور وخصائص Django staff/superuser لا تتغير من هذه الصفحة.",
    reportTitle: "تقرير تفاصيل مستخدم نظام Mhamcloud",
    generatedAt: "تاريخ الإنشاء",
    rows: "صفوف",
  },
  en: {
    title: "System User Details",
    profileTitle: "Profile",
    profileSubtitle: "Your personal details, contact information, and Mhamcloud memberships.",
    profileEditTitle: "Edit my profile",
    profileEditDesc: "Update your name and contact details. Role and permission settings remain under system administration.",
    memberSince: "Member since",
    subtitle:
      "User profile, access, memberships, and permissions recorded on the Mhamcloud platform.",
    back: "Back to system users",
    refresh: "Refresh",
    print: "Print",
    copyId: "Copy ID",
    copied: "User ID copied.",
    userId: "User ID",
    status: "Status",
    role: "Role",
    memberships: "Memberships",
    liveRecord: "From the current record",
    identityTitle: "User identity",
    identityDesc: "Name, username, email, and contact details.",
    accessTitle: "Access & permissions",
    accessDesc: "Access type, role, and recorded system permissions.",
    lifecycleTitle: "Operational history",
    lifecycleDesc: "Created, last seen, suspension, and updated timestamps.",
    membershipsTitle: "Company memberships",
    membershipsDesc:
      "Memberships linked to this user; click a row to open the related company.",
    displayName: "Name",
    username: "Username",
    email: "Email",
    phone: "Phone",
    mobile: "Mobile",
    whatsapp: "WhatsApp",
    profileId: "Profile ID",
    accessType: "Access type",
    workspace: "Default workspace",
    systemRole: "System role",
    rawSystemRole: "Raw role",
    staff: "Django staff",
    superuser: "Superuser",
    systemUser: "System user",
    canAccessSystem: "Can access system",
    defaultCompany: "Default company",
    permissionsTitle: "System permissions",
    noPermissions: "No additional system permissions are recorded.",
    createdAt: "Created at",
    updatedAt: "Updated at",
    lastSeenAt: "Last seen",
    suspendedAt: "Suspended at",
    suspendedReason: "Suspension reason",
    company: "Company",
    membershipRole: "Membership role",
    membershipStatus: "Membership status",
    primary: "Primary",
    jobTitle: "Job title",
    department: "Department",
    joinedAt: "Joined at",
    yes: "Yes",
    no: "No",
    noMemberships: "No company memberships are linked to this user.",
    error: "Could not load user details",
    retry: "Try again",
    refreshed: "User details refreshed.",
    edit: "Edit user",
    accountActionsTitle: "System account management",
    accountActionsDesc:
      "Edit allowed profile fields or change the global system-account state with server-side safety guards.",
    editTitle: "Edit user details",
    editDesc:
      "Only identity fields and the system role can be changed here. Username, password, and Django privilege flags are immutable.",
    firstName: "First name",
    lastName: "Last name",
    saveChanges: "Save changes",
    cancelEdit: "Cancel",
    saved: "User changes saved.",
    activate: "Activate",
    suspend: "Suspend",
    deactivate: "Deactivate",
    confirmStatusTitle: "Confirm user status change",
    confirmStatusDesc:
      "This action applies to the global system account, not to a single company membership.",
    reason: "Action reason",
    reasonPlaceholder: "Enter the suspension or deactivation reason...",
    reasonRequired: "A reason is required for suspend or deactivate.",
    statusUpdated: "User status updated.",
    selfProtection:
      "You cannot suspend or deactivate the account you are currently using.",
    immutableNotice:
      "Username, password, and Django staff/superuser flags are not changed from this page.",
    reportTitle: "Mhamcloud System User Details Report",
    generatedAt: "Generated at",
    rows: "rows",
  },
} as const;

type EditFormState = {
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  phone: string;
  systemRole: SystemUserCreateRole;
};

type BusyMutation = "save" | SystemUserStatusAction | null;

const allSystemRoles: SystemUserCreateRole[] = [
  "SUPPORT",
  "BILLING_MANAGER",
  "SYSTEM_ADMIN",
  "SUPER_ADMIN",
];

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex min-h-10 items-center justify-between gap-4 rounded-md border px-4 py-2.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="min-w-0 text-end text-sm font-medium">{value}</div>
    </div>
  );
}

function LtrValue({ value }: { value: React.ReactNode }) {
  return (
    <span dir="ltr" lang="en" className="tabular-nums">
      {value}
    </span>
  );
}

export default function SystemUserDetailPage({ userId, profileMode = false }: { userId?: string; profileMode?: boolean } = {}) {
  const params = useParams<{ id: string }>();
  const id = String(userId || params?.id || "");
  const session = useAuth();

  const [locale, setLocale] = React.useState<SystemLocale>("ar");
  const [user, setUser] = React.useState<SystemUserRecord | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");
  const [editing, setEditing] = React.useState(false);
  const [busyMutation, setBusyMutation] =
    React.useState<BusyMutation>(null);
  const [statusAction, setStatusAction] =
    React.useState<SystemUserStatusAction | null>(null);
  const [statusReason, setStatusReason] = React.useState("");
  const [editForm, setEditForm] = React.useState<EditFormState>({
    firstName: "",
    lastName: "",
    displayName: "",
    email: "",
    phone: "",
    systemRole: "SUPPORT",
  });

  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const BackIcon = locale === "ar" ? ArrowRight : ArrowLeft;
  const canUpdate = hasPermission(
    session,
    PERMISSIONS.SYSTEM_USERS_UPDATE,
  );
  const actorIsSuperAdmin =
    session.is_superuser === true ||
    String(session.profile?.system_role || "").toUpperCase() ===
      "SUPER_ADMIN" ||
    (session.system_permissions || []).includes("*");
  const currentUserId = String(session.user?.id || "");
  const targetIsSuperAdmin = Boolean(
    user?.isSuperuser ||
      user?.rawSystemRole === "SUPER_ADMIN" ||
      user?.systemRole === "SUPER_ADMIN",
  );
  const isManagedSystemUser = Boolean(
    user?.isSuperuser ||
      (user?.isSystemUser && user?.rawSystemRole !== "NONE"),
  );
  const canMutateTarget = Boolean(
    user &&
      canUpdate &&
      isManagedSystemUser &&
      (!targetIsSuperAdmin || actorIsSuperAdmin),
  );
  const isSelf = Boolean(
    user?.id && currentUserId && user.id === currentUserId,
  );
  const roleOptions = React.useMemo(
    () =>
      actorIsSuperAdmin
        ? allSystemRoles
        : allSystemRoles.filter((role) => role !== "SUPER_ADMIN"),
    [actorIsSuperAdmin],
  );

  React.useEffect(() => {
    const sync = () => {
      const next = readSystemLocale();
      setLocale(next);
      document.documentElement.lang = next;
      document.documentElement.dir = next === "ar" ? "rtl" : "ltr";
      document.body.dir = next === "ar" ? "rtl" : "ltr";
    };

    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("Mhamcloud-locale-changed", sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("Mhamcloud-locale-changed", sync);
    };
  }, []);

  const load = React.useCallback(
    async (silent = false) => {
      if (!id) return;

      try {
        if (!silent) setLoading(true);
        setRefreshing(true);
        setError("");

        const result = await fetchSystemUserDetail(id);
        setUser(result);

        if (silent) {
          toast.success(t.refreshed);
        }
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : t.error;
        setError(message);

        if (silent) {
          toast.error(message);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id, t.error, t.refreshed],
  );

  React.useEffect(() => {
    void load();
  }, [load]);

  function beginEdit() {
    if (!user || !canMutateTarget) return;

    const currentRole = (
      user.rawSystemRole ||
      user.systemRole ||
      "SUPPORT"
    ) as SystemUserCreateRole;

    setEditForm({
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName,
      email: user.email === "—" ? "" : user.email,
      phone: user.phone,
      systemRole: currentRole,
    });
    setEditing(true);
  }

  function updateEditForm<K extends keyof EditFormState>(
    key: K,
    value: EditFormState[K],
  ) {
    setEditForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function saveEdit() {
    if (!user || !canMutateTarget || busyMutation) return;

    try {
      setBusyMutation("save");
      const updated = await updateSystemUser(user.id, {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        displayName: editForm.displayName,
        email: editForm.email,
        phone: editForm.phone,
        systemRole: editForm.systemRole,
      });

      setUser(updated);
      setEditing(false);
      toast.success(t.saved);
    } catch (caught) {
      toast.error(
        caught instanceof Error ? caught.message : t.error,
      );
    } finally {
      setBusyMutation(null);
    }
  }

  function requestStatus(action: SystemUserStatusAction) {
    if (!user || !canMutateTarget || busyMutation) return;
    if (
      isSelf &&
      (action === "suspend" || action === "deactivate")
    ) {
      toast.error(t.selfProtection);
      return;
    }

    setStatusReason("");
    setStatusAction(action);
  }

  async function executeStatus() {
    if (!user || !statusAction || !canMutateTarget || busyMutation) {
      return;
    }

    if (
      statusAction !== "activate" &&
      !statusReason.trim()
    ) {
      toast.error(t.reasonRequired);
      return;
    }

    try {
      setBusyMutation(statusAction);
      await changeSystemUserStatus(user.id, {
        action: statusAction,
        reason: statusReason,
      });

      const refreshedUser = await fetchSystemUserDetail(user.id);
      setUser(refreshedUser);
      setEditing(false);
      setStatusAction(null);
      setStatusReason("");
      toast.success(t.statusUpdated);
    } catch (caught) {
      toast.error(
        caught instanceof Error ? caught.message : t.error,
      );
    } finally {
      setBusyMutation(null);
    }
  }

  const pendingStatusLabel =
    statusAction === "activate"
      ? t.activate
      : statusAction === "suspend"
        ? t.suspend
        : statusAction === "deactivate"
          ? t.deactivate
          : "";

  async function copyId() {
    if (!user?.id) return;

    try {
      await navigator.clipboard.writeText(user.id);
      toast.success(t.copied);
    } catch {
      toast.error(t.error);
    }
  }

  function printDetails() {
    if (!user) return;

    const summary: PrintReportTableSection = {
      title: t.identityTitle,
      columns: [
        { label: t.displayName, width: 170, type: "text" },
        { label: t.username, width: 140, type: "text" },
        { label: t.email, width: 210, type: "text" },
        { label: t.role, width: 130, type: "text" },
        { label: t.accessType, width: 110, type: "text" },
        { label: t.status, width: 110, type: "text" },
        { label: t.createdAt, width: 150, type: "text" },
      ],
      rows: [
        [
          user.displayName,
          user.username,
          user.email,
          systemUserRoleLabel(user.role, locale),
          systemUserAccessLabel(user.accessType, locale),
          systemUserStatusLabel(user.status, locale),
          formatDateTime(user.createdAt),
        ],
      ],
    };

    const memberships: PrintReportTableSection | null =
      user.memberships.length
        ? {
            title: t.membershipsTitle,
            columns: [
              { label: t.company, width: 190, type: "text" },
              { label: t.membershipRole, width: 130, type: "text" },
              { label: t.membershipStatus, width: 120, type: "text" },
              { label: t.jobTitle, width: 150, type: "text" },
              { label: t.department, width: 130, type: "text" },
              { label: t.joinedAt, width: 150, type: "text" },
            ],
            rows: user.memberships.map((membership) => [
              membership.companyName,
              membership.role,
              membership.status,
              membership.jobTitle || "—",
              membership.department || "—",
              formatDateTime(membership.joinedAt),
            ]),
          }
        : null;

    openPrintTableReport({
      locale,
      title: t.reportTitle,
      sections: memberships ? [summary, memberships] : [summary],
      recordsCount: Math.max(1, user.memberships.length),
      recordsLabel: t.rows,
      generatedAtLabel: t.generatedAt,
    });
  }

  if (loading) {
    return (
      <div className="space-y-4 lg:space-y-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <Card dir={dir}>
        <CardContent className="flex min-h-72 flex-col items-center justify-center gap-4 text-center">
          <Activity className="size-9 text-destructive" />
          <CardTitle>{t.error}</CardTitle>
          <p className="text-sm text-muted-foreground">{error || t.error}</p>
          <Button onClick={() => void load()}>{t.retry}</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div dir={dir} className="space-y-4 lg:space-y-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          {!profileMode ? <Button asChild variant="ghost" size="sm" className="-ms-2 mb-2 h-8 px-2 text-muted-foreground"><Link href="/system/users"><BackIcon />{t.back}</Link></Button> : null}
          <h1 className="text-xl font-bold tracking-tight lg:text-2xl">{profileMode ? t.profileTitle : t.title}</h1>
          <p className="mt-1 hidden text-sm text-muted-foreground lg:block">{profileMode ? t.profileSubtitle : t.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!profileMode ? (
            <Button variant="outline" className={registerOutlineButtonClass} onClick={() => void copyId()}>
              <Copy />{t.copyId}
            </Button>
          ) : null}

          <Button
            className={registerBrandButtonClass}
            onClick={() => void load(true)}
            disabled={refreshing}
          >
            <RefreshCw className={refreshing ? "animate-spin" : ""} />
            {t.refresh}
          </Button>

          <Button
            className={registerBrandButtonClass}
            onClick={printDetails}
          >
            <Printer />
            {t.print}
          </Button>
        </div>
      </header>

      <Card className="overflow-hidden border-border/70">
        <div className="relative h-36 overflow-hidden border-b bg-gradient-to-br from-muted/90 via-background to-[#a57b3d]/15 sm:h-44">
          <div className="absolute -end-16 -top-20 size-56 rounded-full border border-[#a57b3d]/20 bg-[#a57b3d]/5" />
          <div className="absolute bottom-5 start-6 text-xs font-medium tracking-[0.18em] text-muted-foreground">
            MHAMCLOUD PRIMEY
          </div>
        </div>
        <CardContent className="relative px-5 pb-6 pt-0 sm:px-7">
          <div className="relative -mt-12 flex flex-col items-center sm:-mt-14">
            <Avatar className="size-24 border-4 border-background bg-background shadow-md sm:size-28">
              <AvatarFallback className="bg-foreground text-2xl font-semibold text-background">
                {(user.displayName || user.username || "U").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="mt-3 min-w-0 max-w-3xl text-center">
              <h2 className="truncate text-xl font-bold sm:text-2xl">{user.displayName || user.username}</h2>
              <div className="mt-1 text-sm text-muted-foreground"><span dir="ltr">@{user.username}</span></div>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                <SystemUserRoleBadge value={user.role} locale={locale} />
                <SystemUserStatusBadge value={user.status} locale={locale} />
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                {user.email && user.email !== "—" ? <span dir="ltr" className="inline-flex items-center gap-1.5"><Mail className="size-3.5 text-[#a57b3d]" />{user.email}</span> : null}
                {user.phone ? <span dir="ltr" className="inline-flex items-center gap-1.5"><Phone className="size-3.5 text-[#a57b3d]" />{user.phone}</span> : null}
                <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-3.5 text-[#a57b3d]" />{t.memberSince}: <LtrValue value={formatDateTime(user.createdAt)} /></span>
              </div>
            </div>
            {canMutateTarget ? (
              <div className="mt-4 sm:absolute sm:end-0 sm:top-16 sm:mt-0">
                <Button className={registerBrandButtonClass} onClick={beginEdit} disabled={Boolean(busyMutation)}>
                  <Pencil />{t.edit}
                </Button>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 lg:gap-6">
        <SystemMetricCard
          title={t.userId}
          value={user.id}
          description={t.liveRecord}
          icon={UserRound}
        />
        <Card>
          <CardHeader>
            <CardTitle icon={ShieldCheck} iconPosition="opposite">
              {t.status}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SystemUserStatusBadge
              value={user.status}
              locale={locale}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle icon={ShieldCheck} iconPosition="opposite">
              {t.role}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SystemUserRoleBadge
              value={user.role}
              locale={locale}
            />
          </CardContent>
        </Card>
        <SystemMetricCard
          title={t.memberships}
          value={user.membershipsCount}
          description={t.liveRecord}
          icon={UsersRound}
        />
      </div>

      {canMutateTarget && !profileMode ? (
        <Card>
          <CardHeader>
            <CardTitle icon={ShieldCheck}>
              {t.accountActionsTitle}
            </CardTitle>
            <CardDescription>{t.accountActionsDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                className={registerBrandButtonClass}
                onClick={beginEdit}
                disabled={Boolean(busyMutation)}
              >
                <Pencil />
                {t.edit}
              </Button>

              {user.status !== "ACTIVE" ? (
                <Button
                  className={registerBrandButtonClass}
                  onClick={() => requestStatus("activate")}
                  disabled={Boolean(busyMutation)}
                >
                  <UserCheck />
                  {t.activate}
                </Button>
              ) : null}

              {user.status === "ACTIVE" && !isSelf ? (
                <Button
                  className={registerBrandButtonClass}
                  onClick={() => requestStatus("suspend")}
                  disabled={Boolean(busyMutation)}
                >
                  <Ban />
                  {t.suspend}
                </Button>
              ) : null}

              {user.status !== "INACTIVE" && !isSelf ? (
                <Button
                  className={registerBrandButtonClass}
                  onClick={() => requestStatus("deactivate")}
                  disabled={Boolean(busyMutation)}
                >
                  <UserX />
                  {t.deactivate}
                </Button>
              ) : null}
            </div>

            {isSelf ? (
              <p className="text-xs text-muted-foreground">
                {t.selfProtection}
              </p>
            ) : null}

            <p className="text-xs text-muted-foreground">
              {t.immutableNotice}
            </p>
          </CardContent>
        </Card>
      ) : null}

      {editing && canMutateTarget ? (
        <Card>
          <CardHeader>
            <CardTitle icon={Pencil}>{profileMode ? t.profileEditTitle : t.editTitle}</CardTitle>
            <CardDescription>{profileMode ? t.profileEditDesc : t.editDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <label className="space-y-2">
                <span className="text-sm font-medium">{t.firstName}</span>
                <Input
                  value={editForm.firstName}
                  onChange={(event) =>
                    updateEditForm("firstName", event.target.value)
                  }
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium">{t.lastName}</span>
                <Input
                  value={editForm.lastName}
                  onChange={(event) =>
                    updateEditForm("lastName", event.target.value)
                  }
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium">{t.displayName}</span>
                <Input
                  value={editForm.displayName}
                  onChange={(event) =>
                    updateEditForm("displayName", event.target.value)
                  }
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium">{t.email}</span>
                <Input
                  dir="ltr"
                  type="email"
                  value={editForm.email}
                  onChange={(event) =>
                    updateEditForm("email", event.target.value)
                  }
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium">{t.phone}</span>
                <Input
                  dir="ltr"
                  inputMode="tel"
                  value={editForm.phone}
                  onChange={(event) =>
                    updateEditForm("phone", event.target.value)
                  }
                />
              </label>

              {!profileMode ? (
              <label className="space-y-2">
                <span className="text-sm font-medium">{t.systemRole}</span>
                <Select
                  value={editForm.systemRole}
                  onValueChange={(value) =>
                    updateEditForm(
                      "systemRole",
                      value as SystemUserCreateRole,
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((role) => (
                      <SelectItem key={role} value={role}>
                        {systemUserRoleLabel(role, locale)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              ) : null}
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <Button
                variant="outline"
                className={registerOutlineButtonClass}
                onClick={() => setEditing(false)}
                disabled={Boolean(busyMutation)}
              >
                {t.cancelEdit}
              </Button>
              <Button
                className={registerBrandButtonClass}
                onClick={() => void saveEdit()}
                disabled={Boolean(busyMutation)}
              >
                {busyMutation === "save" ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Save />
                )}
                {t.saveChanges}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2 lg:gap-6">
        <Card>
          <CardHeader>
            <CardTitle icon={UserRound}>{t.identityTitle}</CardTitle>
            <CardDescription>{t.identityDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <InfoRow label={t.displayName} value={user.displayName} />
            <InfoRow
              label={t.username}
              value={<span dir="ltr">{user.username}</span>}
            />
            <InfoRow
              label={t.email}
              value={
                <span dir="ltr" className="break-all">
                  {user.email}
                </span>
              }
            />
            <InfoRow
              label={t.phone}
              value={<span dir="ltr">{user.phone || "—"}</span>}
            />
            <InfoRow
              label={t.mobile}
              value={<span dir="ltr">{user.mobile || "—"}</span>}
            />
            <InfoRow
              label={t.whatsapp}
              value={<span dir="ltr">{user.whatsappNumber || "—"}</span>}
            />
            {!profileMode ? (
              <InfoRow label={t.profileId} value={<LtrValue value={user.profileId || "—"} />} />
            ) : null}
          </CardContent>
        </Card>

        {!profileMode ? (
        <Card>
          <CardHeader>
            <CardTitle icon={ShieldCheck}>{t.accessTitle}</CardTitle>
            <CardDescription>{t.accessDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <InfoRow
              label={t.accessType}
              value={systemUserAccessLabel(user.accessType, locale)}
            />
            <InfoRow
              label={t.workspace}
              value={user.defaultWorkspace || "—"}
            />
            <InfoRow
              label={t.systemRole}
              value={systemUserRoleLabel(user.systemRole, locale)}
            />
            <InfoRow
              label={t.rawSystemRole}
              value={systemUserRoleLabel(user.rawSystemRole, locale)}
            />
            <InfoRow
              label={t.staff}
              value={user.isStaff ? t.yes : t.no}
            />
            <InfoRow
              label={t.superuser}
              value={user.isSuperuser ? t.yes : t.no}
            />
            <InfoRow
              label={t.systemUser}
              value={user.isSystemUser ? t.yes : t.no}
            />
            <InfoRow
              label={t.canAccessSystem}
              value={user.canAccessSystem ? t.yes : t.no}
            />
            <InfoRow
              label={t.defaultCompany}
              value={
                user.defaultCompanyId ? (
                  <Link
                    href={`/system/companies/${user.defaultCompanyId}`}
                    className="hover:underline"
                  >
                    <LtrValue value={`#${user.defaultCompanyId}`} />
                  </Link>
                ) : (
                  "—"
                )
              }
            />

            <div className="rounded-md border px-4 py-3">
              <p className="text-sm text-muted-foreground">
                {t.permissionsTitle}
              </p>
              {user.systemPermissions.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {user.systemPermissions.map((permission) => (
                    <span
                      key={permission}
                      dir="ltr"
                      className="rounded-md border bg-muted/30 px-2 py-1 text-xs"
                    >
                      {permission}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  {t.noPermissions}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        ) : null}

        <Card>
          <CardHeader>
            <CardTitle icon={CalendarDays}>{t.lifecycleTitle}</CardTitle>
            <CardDescription>{t.lifecycleDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <InfoRow
              label={t.createdAt}
              value={<LtrValue value={formatDateTime(user.createdAt)} />}
            />
            <InfoRow
              label={t.updatedAt}
              value={<LtrValue value={formatDateTime(user.updatedAt)} />}
            />
            <InfoRow
              label={t.lastSeenAt}
              value={<LtrValue value={formatDateTime(user.lastSeenAt)} />}
            />
            {!profileMode ? (
              <>
                <InfoRow label={t.suspendedAt} value={<LtrValue value={formatDateTime(user.suspendedAt)} />} />
                <InfoRow label={t.suspendedReason} value={user.suspendedReason || "—"} />
              </>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle icon={Building2}>{t.membershipsTitle}</CardTitle>
            <CardDescription>{t.membershipsDesc}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <InfoRow
              label={t.memberships}
              value={<LtrValue value={formatInteger(user.membershipsCount)} />}
            />
            <InfoRow
              label={t.status}
              value={
                <LtrValue value={formatInteger(user.activeMembershipsCount)} />
              }
            />
            <InfoRow
              label={t.company}
              value={user.companyName || "—"}
            />
            <InfoRow
              label={t.membershipRole}
              value={user.companyRole || "—"}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle icon={TableProperties}>{t.membershipsTitle}</CardTitle>
          <CardDescription>{t.membershipsDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          {user.memberships.length ? (
            <DataRegisterTableFrame>
              <Table className="min-w-[1060px] table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[230px]">{t.company}</TableHead>
                    <TableHead className="w-[150px]">
                      {t.membershipRole}
                    </TableHead>
                    <TableHead className="w-[145px]">
                      {t.membershipStatus}
                    </TableHead>
                    <TableHead className="w-[110px]">{t.primary}</TableHead>
                    <TableHead className="w-[170px]">{t.jobTitle}</TableHead>
                    <TableHead className="w-[150px]">{t.department}</TableHead>
                    <TableHead className="w-[170px]">{t.joinedAt}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {user.memberships.map((membership) => (
                    <TableRow
                      key={membership.id}
                      href={
                        membership.companyId
                          ? `/system/companies/${membership.companyId}`
                          : undefined
                      }
                    >
                      <TableCell>
                        <div className="font-medium">
                          {membership.companyName}
                        </div>
                        {membership.companyId ? (
                          <div
                            dir="ltr"
                            lang="en"
                            className="mt-1 text-xs text-muted-foreground tabular-nums"
                          >
                            #{membership.companyId}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell>{membership.role || "—"}</TableCell>
                      <TableCell>{membership.status || "—"}</TableCell>
                      <TableCell>
                        {membership.isPrimary ? t.yes : t.no}
                      </TableCell>
                      <TableCell>{membership.jobTitle || "—"}</TableCell>
                      <TableCell>{membership.department || "—"}</TableCell>
                      <TableCell>
                        <LtrValue
                          value={formatDateTime(membership.joinedAt)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </DataRegisterTableFrame>
          ) : (
            <div className="flex min-h-40 items-center justify-center rounded-lg border text-sm text-muted-foreground">
              {t.noMemberships}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={Boolean(statusAction)}
        onOpenChange={(open) => {
          if (!open && !busyMutation) {
            setStatusAction(null);
            setStatusReason("");
          }
        }}
      >
        <AlertDialogContent dir={dir}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.confirmStatusTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.confirmStatusDesc} {pendingStatusLabel}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {statusAction && statusAction !== "activate" ? (
            <label className="space-y-2">
              <span className="text-sm font-medium">{t.reason}</span>
              <Input
                value={statusReason}
                onChange={(event) =>
                  setStatusReason(event.target.value)
                }
                placeholder={t.reasonPlaceholder}
              />
            </label>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(busyMutation)}>
              {t.cancelEdit}
            </AlertDialogCancel>
            <AlertDialogAction
              className={registerBrandButtonClass}
              disabled={Boolean(busyMutation)}
              onClick={(event) => {
                event.preventDefault();
                void executeStatus();
              }}
            >
              {busyMutation === statusAction ? (
                <Loader2 className="animate-spin" />
              ) : statusAction === "activate" ? (
                <UserCheck />
              ) : statusAction === "suspend" ? (
                <Ban />
              ) : (
                <UserX />
              )}
              {pendingStatusLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
