import Image from "next/image";
import { Building2 } from "lucide-react";
export default function CompanyPage() {
  return <div className="space-y-6" dir="rtl"><div><p className="text-sm text-muted-foreground">Primey V2</p><h1 className="text-3xl font-bold tracking-tight">لوحة الشركة</h1><p className="mt-2 text-muted-foreground">تم التحقق من جلسة الشركة بنجاح. سيتم ربط لوحة BundUI ببيانات Primey في المرحلة التالية.</p></div><div className="rounded-2xl border bg-card p-6 shadow-sm"><div className="flex items-center gap-3"><Building2 className="size-5" /><span className="font-medium">Company workspace authenticated</span><Image src="/currency/sar.svg" alt="SAR" width={18} height={18} /></div></div></div>;
}
