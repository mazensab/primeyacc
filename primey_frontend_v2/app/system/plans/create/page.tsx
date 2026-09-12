"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CircleAlert, Plus } from "lucide-react";
import { toast } from "sonner";

import { SystemPlanForm, emptyPlanFormValues, formValuesToMutation, type PlanFormValues } from "@/app/system/plans/components/plan-form";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { createSystemPlan, readSystemLocale, type SystemLocale } from "@/lib/system-plans";

const translations = {
  ar: { title: "إنشاء باقة", subtitle: "إضافة باقة جديدة بالأسعار والحدود والمميزات والحالة والظهور.", back: "العودة للخطط والأسعار", submit: "إنشاء الباقة", created: "تم إنشاء الباقة بنجاح.", denied: "لا تملك صلاحية إنشاء الباقات." },
  en: { title: "Create plan", subtitle: "Add a new plan with pricing, limits, features, status, and visibility.", back: "Back to plans & pricing", submit: "Create plan", created: "Plan created successfully.", denied: "You do not have permission to create plans." },
} as const;

export default function SystemPlanCreatePage() {
  const router = useRouter();
  const session = useAuth();
  const [locale, setLocale] = React.useState<SystemLocale>("ar");
  const [busy, setBusy] = React.useState(false);
  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const BackIcon = locale === "ar" ? ArrowRight : ArrowLeft;
  const canCreate = hasPermission(session, PERMISSIONS.SYSTEM_PLANS_CREATE);

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

  async function submit(values: PlanFormValues) {
    try {
      setBusy(true);
      const plan = await createSystemPlan(formValuesToMutation(values));
      toast.success(t.created);
      router.push(`/system/plans/${plan.id}`);
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  }

  if (!canCreate) {
    return <Card dir={dir}><CardContent className="flex min-h-72 flex-col items-center justify-center gap-4 text-center"><CircleAlert className="size-9 text-destructive" /><CardTitle>{t.denied}</CardTitle><Button variant="outline" asChild><Link href="/system/plans"><BackIcon />{t.back}</Link></Button></CardContent></Card>;
  }

  return (
    <div dir={dir} className="space-y-4 lg:space-y-6">
      <header className="flex flex-row items-start justify-between gap-3">
        <div><div className="flex items-center gap-2"><h1 className="text-xl font-bold tracking-tight lg:text-2xl">{t.title}</h1><Plus className="size-5 text-[#a57b3d]" /></div><p className="mt-1 hidden text-sm text-muted-foreground lg:block">{t.subtitle}</p></div>
        <Button variant="outline" asChild><Link href="/system/plans"><BackIcon /><span className="hidden lg:inline">{t.back}</span></Link></Button>
      </header>
      <SystemPlanForm locale={locale} initialValues={emptyPlanFormValues} busy={busy} submitLabel={t.submit} onSubmit={submit} onCancel={() => router.push("/system/plans")} />
    </div>
  );
}
