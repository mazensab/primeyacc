"use client";

import * as React from "react";
import Link from "next/link";
import { Eye, EyeOff, Loader2, Pencil, Power, ShieldCheck } from "lucide-react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { registerBrandButtonClass, registerOutlineButtonClass } from "@/components/ui/data-register";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { changeSystemPlanStatus, type SystemLocale, type SystemPlanStatusAction } from "@/lib/system-plans";

const translations = {
  ar: {
    title: "إجراءات الباقة",
    desc: "تعديل الباقة أو تغيير حالة التفعيل والظهور وفق صلاحيات النظام.",
    edit: "تعديل الباقة",
    activate: "تفعيل الباقة",
    deactivate: "تعطيل الباقة",
    publish: "إظهار للاشتراك",
    hide: "إخفاء من الاشتراك",
    confirmTitle: "تأكيد الإجراء",
    activateConfirm: "هل تريد تفعيل هذه الباقة؟",
    deactivateConfirm: "تعطيل الباقة لا يلغي الاشتراكات الحالية. هل تريد المتابعة؟",
    publishConfirm: "هل تريد إظهار هذه الباقة للاشتراك؟",
    hideConfirm: "إخفاء الباقة يمنع ظهورها للاشتراكات الجديدة ولا يلغي الاشتراكات الحالية. هل تريد المتابعة؟",
    confirm: "تأكيد",
    back: "تراجع",
    success: "تم تحديث حالة الباقة بنجاح.",
  },
  en: {
    title: "Plan actions",
    desc: "Edit the plan or change activation and visibility according to system permissions.",
    edit: "Edit plan",
    activate: "Activate plan",
    deactivate: "Deactivate plan",
    publish: "Publish plan",
    hide: "Hide plan",
    confirmTitle: "Confirm action",
    activateConfirm: "Activate this plan?",
    deactivateConfirm: "Deactivating the plan does not cancel existing subscriptions. Continue?",
    publishConfirm: "Publish this plan for subscription?",
    hideConfirm: "Hiding the plan prevents new public subscriptions and does not cancel existing subscriptions. Continue?",
    confirm: "Confirm",
    back: "Back",
    success: "Plan status updated successfully.",
  },
} as const;

export function PlanManagementActions({
  id,
  active,
  isPublic,
  locale,
  onChanged,
}: {
  id: string;
  active: boolean;
  isPublic: boolean;
  locale: SystemLocale;
  onChanged: () => void | Promise<void>;
}) {
  const session = useAuth();
  const canUpdate = hasPermission(session, PERMISSIONS.SYSTEM_PLANS_UPDATE);
  const [pending, setPending] = React.useState<SystemPlanStatusAction | null>(null);
  const [busy, setBusy] = React.useState(false);
  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";

  if (!canUpdate) return null;

  function confirmationText() {
    if (pending === "activate") return t.activateConfirm;
    if (pending === "deactivate") return t.deactivateConfirm;
    if (pending === "publish") return t.publishConfirm;
    if (pending === "hide") return t.hideConfirm;
    return "";
  }

  async function execute() {
    if (!pending) return;
    try {
      setBusy(true);
      await changeSystemPlanStatus(id, pending);
      toast.success(t.success);
      setPending(null);
      await onChanged();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle icon={ShieldCheck}>{t.title}</CardTitle>
          <CardDescription>{t.desc}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <Button className={registerBrandButtonClass} asChild>
            <Link href={`/system/plans/${id}/edit`}><Pencil />{t.edit}</Link>
          </Button>
          <Button variant="outline" className={registerOutlineButtonClass} onClick={() => setPending(active ? "deactivate" : "activate")}>
            <Power />{active ? t.deactivate : t.activate}
          </Button>
          <Button variant="outline" className={registerOutlineButtonClass} onClick={() => setPending(isPublic ? "hide" : "publish")}>
            {isPublic ? <EyeOff /> : <Eye />}{isPublic ? t.hide : t.publish}
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={Boolean(pending)} onOpenChange={(open) => { if (!open && !busy) setPending(null); }}>
        <AlertDialogContent dir={dir}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{confirmationText()}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{t.back}</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(event) => {
                event.preventDefault();
                void execute();
              }}
            >
              {busy ? <Loader2 className="animate-spin" /> : null}{t.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
