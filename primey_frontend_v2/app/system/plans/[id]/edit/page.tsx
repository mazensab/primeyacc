"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CircleAlert, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";

import { SystemPlanForm, formValuesToMutation, planToFormValues, type PlanFormValues } from "@/app/system/plans/components/plan-form";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { fetchSystemPlanDetail, readSystemLocale, updateSystemPlan, type SystemLocale, type SystemPlanDetail } from "@/lib/system-plans";

const translations = {
  ar: { title: "تعديل الباقة", subtitle: "تحديث بيانات الباقة وأسعارها وحدودها ومميزاتها.", back: "العودة لتفاصيل الباقة", submit: "حفظ التعديلات", updated: "تم تحديث الباقة بنجاح.", denied: "لا تملك صلاحية تعديل الباقات.", error: "تعذر تحميل الباقة." },
  en: { title: "Edit plan", subtitle: "Update plan information, pricing, limits, and features.", back: "Back to plan details", submit: "Save changes", updated: "Plan updated successfully.", denied: "You do not have permission to update plans.", error: "Could not load plan." },
} as const;

export default function SystemPlanEditPage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id || "");
  const router = useRouter();
  const session = useAuth();
  const [locale, setLocale] = React.useState<SystemLocale>("ar");
  const [plan, setPlan] = React.useState<SystemPlanDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const BackIcon = locale === "ar" ? ArrowRight : ArrowLeft;
  const canUpdate = hasPermission(session, PERMISSIONS.SYSTEM_PLANS_UPDATE);

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

  React.useEffect(() => {
    let active = true;
    async function load() {
      if (!id) return;
      try {
        setLoading(true);
        setError("");
        const result = await fetchSystemPlanDetail(id);
        if (active) setPlan(result.plan);
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : t.error);
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [id, t.error]);

  async function submit(values: PlanFormValues) {
    try {
      setBusy(true);
      await updateSystemPlan(id, formValuesToMutation(values));
      toast.success(t.updated);
      router.push(`/system/plans/${id}`);
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  }

  if (!canUpdate) {
    return <Card dir={dir}><CardContent className="flex min-h-72 flex-col items-center justify-center gap-4 text-center"><CircleAlert className="size-9 text-destructive" /><CardTitle>{t.denied}</CardTitle><Button variant="outline" asChild><Link href={`/system/plans/${id}`}><BackIcon />{t.back}</Link></Button></CardContent></Card>;
  }
  if (loading) return <div className="flex min-h-72 items-center justify-center"><Loader2 className="size-8 animate-spin" /></div>;
  if (error || !plan) {
    return <Card dir={dir}><CardContent className="flex min-h-72 flex-col items-center justify-center gap-4 text-center"><CircleAlert className="size-9 text-destructive" /><CardTitle>{error || t.error}</CardTitle><Button variant="outline" asChild><Link href={`/system/plans/${id}`}><BackIcon />{t.back}</Link></Button></CardContent></Card>;
  }

  return (
    <div dir={dir} className="space-y-4 lg:space-y-6">
      <header className="flex flex-row items-start justify-between gap-3">
        <div><div className="flex items-center gap-2"><h1 className="text-xl font-bold tracking-tight lg:text-2xl">{t.title}</h1><Pencil className="size-5 text-[#a57b3d]" /></div><p className="mt-1 hidden text-sm text-muted-foreground lg:block">{t.subtitle}</p></div>
        <Button variant="outline" asChild><Link href={`/system/plans/${id}`}><BackIcon /><span className="hidden lg:inline">{t.back}</span></Link></Button>
      </header>
      <SystemPlanForm locale={locale} initialValues={planToFormValues(plan)} busy={busy} submitLabel={t.submit} onSubmit={submit} onCancel={() => router.push(`/system/plans/${id}`)} />
    </div>
  );
}
