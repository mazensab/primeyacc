"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  KeyRound,
  Loader2,
  Save,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/AuthProvider";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import {
  createSystemUser,
  systemUserRoleLabel,
  type SystemUserCreateRole,
  type SystemUserCreateStatus,
} from "@/lib/system-users";
import {
  readSystemLocale,
  type SystemLocale,
} from "@/lib/system-subscriptions";

type FormState = {
  username: string;
  password: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: SystemUserCreateRole;
  status: SystemUserCreateStatus;
  statusReason: string;
};

const initialForm: FormState = {
  username: "",
  password: "",
  email: "",
  firstName: "",
  lastName: "",
  phone: "",
  role: "SUPPORT",
  status: "ACTIVE",
  statusReason: "",
};

const translations = {
  ar: {
    title: "إضافة مستخدم نظام",
    subtitle:
      "إنشاء حساب جديد للوصول إلى مساحة النظام. هذه الصفحة تنشئ مستخدمًا جديدًا فقط ولا تغيّر كلمات مرور المستخدمين الحاليين.",
    back: "العودة لمستخدمي النظام",
    accountTitle: "بيانات الحساب",
    accountDesc: "بيانات تسجيل الدخول والهوية الأساسية للمستخدم الجديد.",
    accessTitle: "الوصول إلى النظام",
    accessDesc:
      "اختر أقل دور مناسب للعمل المطلوب. الدور الافتراضي هو الدعم لتقليل الصلاحيات.",
    username: "اسم المستخدم",
    password: "كلمة المرور",
    passwordHint: "8 أحرف على الأقل. تستخدم لهذا المستخدم الجديد فقط.",
    email: "البريد الإلكتروني",
    firstName: "الاسم الأول",
    lastName: "اسم العائلة",
    phone: "رقم الجوال",
    role: "دور النظام",
    status: "حالة الحساب",
    active: "نشط",
    inactive: "غير نشط",
    suspended: "موقوف",
    statusReason: "سبب الحالة / ملاحظة",
    statusReasonPlaceholder:
      "اكتب السبب عند إنشاء الحساب كموقوف، أو ملاحظة إدارية اختيارية...",
    create: "إنشاء مستخدم النظام",
    creating: "جاري الإنشاء...",
    permissionDenied: "لا تملك صلاحية إنشاء مستخدم نظام.",
    requiredUsername: "اسم المستخدم مطلوب.",
    passwordTooShort: "كلمة المرور يجب ألا تقل عن 8 أحرف.",
    confirmTitle: "تأكيد إنشاء مستخدم النظام",
    confirmDescription:
      "سيتم إنشاء حساب دخول جديد ومنحه وصول النظام بالدور المحدد. لا يمكن التراجع عن الإنشاء من هذه الصفحة.",
    confirmUser: "المستخدم",
    confirmRole: "الدور",
    confirmStatus: "الحالة",
    cancel: "إلغاء",
    confirm: "تأكيد الإنشاء",
    created: "تم إنشاء مستخدم النظام بنجاح.",
    failed: "تعذر إنشاء مستخدم النظام.",
    supportNote:
      "لا يتم ربط هذا الحساب بأي شركة تلقائيًا. إضافة مستخدم شركة تتم من صفحة الشركة.",
  },
  en: {
    title: "Add System User",
    subtitle:
      "Create a new account for system workspace access. This page only creates new users and never changes passwords for existing users.",
    back: "Back to system users",
    accountTitle: "Account details",
    accountDesc: "Login and identity details for the new user.",
    accessTitle: "System access",
    accessDesc:
      "Choose the least-privileged role needed. Support is the default role.",
    username: "Username",
    password: "Password",
    passwordHint: "At least 8 characters. Used only for this new user.",
    email: "Email",
    firstName: "First name",
    lastName: "Last name",
    phone: "Mobile",
    role: "System role",
    status: "Account status",
    active: "Active",
    inactive: "Inactive",
    suspended: "Suspended",
    statusReason: "Status reason / note",
    statusReasonPlaceholder:
      "Enter a reason when creating a suspended account, or an optional admin note...",
    create: "Create system user",
    creating: "Creating...",
    permissionDenied: "You do not have permission to create a system user.",
    requiredUsername: "Username is required.",
    passwordTooShort: "Password must be at least 8 characters.",
    confirmTitle: "Confirm system user creation",
    confirmDescription:
      "A new login account will be created and granted system access with the selected role. Creation cannot be undone from this page.",
    confirmUser: "User",
    confirmRole: "Role",
    confirmStatus: "Status",
    cancel: "Cancel",
    confirm: "Confirm creation",
    created: "System user created successfully.",
    failed: "Could not create system user.",
    supportNote:
      "This account is not linked to a company automatically. Company users are added from the company page.",
  },
} as const;

const allRoleOptions: SystemUserCreateRole[] = [
  "SUPPORT",
  "BILLING_MANAGER",
  "SYSTEM_ADMIN",
  "SUPER_ADMIN",
];

function statusLabel(
  value: SystemUserCreateStatus,
  locale: SystemLocale,
) {
  const t = translations[locale];

  if (value === "ACTIVE") return t.active;
  if (value === "INACTIVE") return t.inactive;
  return t.suspended;
}

export default function CreateSystemUserPage() {
  const router = useRouter();
  const session = useAuth();

  const [locale, setLocale] = React.useState<SystemLocale>("ar");
  const [form, setForm] = React.useState<FormState>(initialForm);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const BackIcon = locale === "ar" ? ArrowRight : ArrowLeft;
  const canCreate = hasPermission(
    session,
    PERMISSIONS.SYSTEM_USERS_CREATE,
  );
  const canCreateSuperAdmin =
    session.is_superuser === true ||
    String(session.profile?.system_role || "").toUpperCase() ===
      "SUPER_ADMIN" ||
    (session.system_permissions || []).includes("*");
  const roleOptions = React.useMemo(
    () =>
      canCreateSuperAdmin
        ? allRoleOptions
        : allRoleOptions.filter((role) => role !== "SUPER_ADMIN"),
    [canCreateSuperAdmin],
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

  function update<K extends keyof FormState>(
    key: K,
    value: FormState[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function requestConfirmation(event: React.FormEvent) {
    event.preventDefault();

    if (!form.username.trim()) {
      toast.error(t.requiredUsername);
      return;
    }

    if (form.password.length < 8) {
      toast.error(t.passwordTooShort);
      return;
    }

    setConfirmOpen(true);
  }

  async function confirmCreate() {
    if (!canCreate || submitting) return;

    try {
      setSubmitting(true);

      const created = await createSystemUser({
        username: form.username,
        password: form.password,
        email: form.email,
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        systemRole: form.role,
        status: form.status,
        statusReason: form.statusReason,
      });

      toast.success(t.created);
      setConfirmOpen(false);
      router.push(`/system/users/${created.id}`);
      router.refresh();
    } catch (caught) {
      toast.error(
        caught instanceof Error ? caught.message : t.failed,
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!canCreate) {
    return (
      <Card dir={dir}>
        <CardContent className="flex min-h-72 flex-col items-center justify-center gap-4 text-center">
          <ShieldCheck className="size-10 text-muted-foreground" />
          <CardTitle>{t.permissionDenied}</CardTitle>
          <Button asChild variant="outline">
            <Link href="/system/users">
              <BackIcon />
              {t.back}
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div dir={dir} className="space-y-4 lg:space-y-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="-ms-2 mb-2 h-8 px-2 text-muted-foreground"
          >
            <Link href="/system/users">
              <BackIcon />
              {t.back}
            </Link>
          </Button>

          <h1 className="text-xl font-bold tracking-tight lg:text-2xl">
            {t.title}
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            {t.subtitle}
          </p>
        </div>
      </header>

      <form onSubmit={requestConfirmation} className="space-y-4 lg:space-y-6">
        <div className="grid gap-4 xl:grid-cols-2 lg:gap-6">
          <Card>
            <CardHeader>
              <CardTitle icon={UserPlus}>{t.accountTitle}</CardTitle>
              <CardDescription>{t.accountDesc}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium">{t.username}</span>
                <Input
                  dir="ltr"
                  autoComplete="username"
                  value={form.username}
                  onChange={(event) =>
                    update("username", event.target.value)
                  }
                  required
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium">{t.email}</span>
                <Input
                  dir="ltr"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(event) =>
                    update("email", event.target.value)
                  }
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium">{t.firstName}</span>
                <Input
                  value={form.firstName}
                  onChange={(event) =>
                    update("firstName", event.target.value)
                  }
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium">{t.lastName}</span>
                <Input
                  value={form.lastName}
                  onChange={(event) =>
                    update("lastName", event.target.value)
                  }
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium">{t.phone}</span>
                <Input
                  dir="ltr"
                  inputMode="tel"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={(event) =>
                    update("phone", event.target.value)
                  }
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium">{t.password}</span>
                <Input
                  dir="ltr"
                  type="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(event) =>
                    update("password", event.target.value)
                  }
                  minLength={8}
                  required
                />
                <span className="block text-xs text-muted-foreground">
                  {t.passwordHint}
                </span>
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle icon={ShieldCheck}>{t.accessTitle}</CardTitle>
              <CardDescription>{t.accessDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="block space-y-2">
                <span className="text-sm font-medium">{t.role}</span>
                <Select
                  value={form.role}
                  onValueChange={(value) =>
                    update("role", value as SystemUserCreateRole)
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

              <label className="block space-y-2">
                <span className="text-sm font-medium">{t.status}</span>
                <Select
                  value={form.status}
                  onValueChange={(value) =>
                    update(
                      "status",
                      value as SystemUserCreateStatus,
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">{t.active}</SelectItem>
                    <SelectItem value="INACTIVE">{t.inactive}</SelectItem>
                    <SelectItem value="SUSPENDED">{t.suspended}</SelectItem>
                  </SelectContent>
                </Select>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium">
                  {t.statusReason}
                </span>
                <Input
                  value={form.statusReason}
                  onChange={(event) =>
                    update("statusReason", event.target.value)
                  }
                  placeholder={t.statusReasonPlaceholder}
                />
              </label>

              <div className="rounded-lg border bg-muted/20 p-4">
                <div className="flex items-start gap-3">
                  <KeyRound className="mt-0.5 size-5 shrink-0 text-[#a57b3d]" />
                  <p className="text-sm leading-6 text-muted-foreground">
                    {t.supportNote}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            asChild
            variant="outline"
            className={registerOutlineButtonClass}
          >
            <Link href="/system/users">{t.cancel}</Link>
          </Button>

          <Button
            type="submit"
            className={registerBrandButtonClass}
            disabled={submitting}
          >
            <Save />
            {t.create}
          </Button>
        </div>
      </form>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent dir={dir}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.confirmDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2 rounded-lg border bg-muted/20 p-4 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">{t.confirmUser}</span>
              <span dir="ltr" className="font-medium">
                {form.username}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">{t.confirmRole}</span>
              <span className="font-medium">
                {systemUserRoleLabel(form.role, locale)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">{t.confirmStatus}</span>
              <span className="font-medium">
                {statusLabel(form.status, locale)}
              </span>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>
              {t.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              className={registerBrandButtonClass}
              disabled={submitting}
              onClick={(event) => {
                event.preventDefault();
                void confirmCreate();
              }}
            >
              {submitting ? (
                <Loader2 className="animate-spin" />
              ) : (
                <UserPlus />
              )}
              {submitting ? t.creating : t.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
