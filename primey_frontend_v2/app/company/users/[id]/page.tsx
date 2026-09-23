"use client";
import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowRight, CalendarDays, Mail, Phone, RefreshCw, ShieldCheck, UserRound, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SystemMetricCard } from "@/components/ui/system-metric-card";
import { registerBrandButtonClass } from "@/components/ui/data-register";
type Obj=Record<string,any>;
function obj(v:any):Obj{return v&&typeof v==="object"&&!Array.isArray(v)?v:{}}
function apiBase(){const r=String(process.env.NEXT_PUBLIC_API_BASE_URL||process.env.NEXT_PUBLIC_API_URL||"").replace(/\/+$/,"");return r.endsWith("/api")?r.slice(0,-4):r}
function dt(v:any){if(!v)return "—";const d=new Date(String(v));return Number.isNaN(d.getTime())?String(v):new Intl.DateTimeFormat("ar-SA",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}).format(d)}
function InfoRow({label,value}:{label:string;value:React.ReactNode}){return <div className="flex min-h-10 items-center justify-between gap-4 rounded-md border px-4 py-2.5"><span className="text-sm text-muted-foreground">{label}</span><div className="min-w-0 text-end text-sm font-medium">{value}</div></div>}
export default function CompanyUserProfilePage(){
 const params=useParams<{id:string}>(), userId=String(params?.id||"");
 const [data,setData]=React.useState<Obj|null>(null),[loading,setLoading]=React.useState(true),[error,setError]=React.useState("");
 const load=React.useCallback(async(silent=false)=>{try{if(!silent)setLoading(true);setError("");
  const lr=await fetch(`${apiBase()}/api/company/users/`,{credentials:"include",cache:"no-store",headers:{Accept:"application/json","X-Requested-With":"XMLHttpRequest"}});
  const lp=await lr.json().catch(()=>({}));if(!lr.ok||lp?.ok===false)throw new Error(lp?.message||lp?.detail||`HTTP ${lr.status}`);
  const raw=Array.isArray(lp?.data)?lp.data:Array.isArray(lp?.data?.results)?lp.data.results:Array.isArray(lp?.results)?lp.results:[];
  const found=raw.find((x:any)=>String(x?.user?.id??x?.user_id??"")===userId),membershipId=found?.id??found?.membership_id;
  if(!membershipId)throw new Error("المستخدم غير موجود ضمن الشركة الحالية.");
  const r=await fetch(`${apiBase()}/api/company/users/${membershipId}/`,{credentials:"include",cache:"no-store",headers:{Accept:"application/json","X-Requested-With":"XMLHttpRequest"}});
  const p=await r.json().catch(()=>({}));if(!r.ok||p?.ok===false)throw new Error(p?.message||p?.detail||`HTTP ${r.status}`);
  setData(obj(p?.data?.membership));if(silent)toast.success("تم تحديث بيانات المستخدم.");
 }catch(e){const m=e instanceof Error?e.message:"تعذر تحميل بيانات المستخدم";setError(m);if(silent)toast.error(m)}finally{setLoading(false)}},[userId]);
 React.useEffect(()=>{void load()},[load]);
 if(loading)return <div className="space-y-4"><Skeleton className="h-10 w-72"/><Skeleton className="h-80"/><div className="grid gap-4 md:grid-cols-2"><Skeleton className="h-72"/><Skeleton className="h-72"/></div></div>;
 if(error||!data)return <Card dir="rtl"><CardContent className="flex min-h-72 flex-col items-center justify-center gap-4"><p className="font-medium">{error||"تعذر تحميل بيانات المستخدم"}</p><Button onClick={()=>void load()}>إعادة المحاولة</Button></CardContent></Card>;
 const user=obj(data.user),profile=obj(data.profile),name=String(profile.display_name||user.name||user.username||"مستخدم"),initials=name.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase();
 return <div dir="rtl" className="space-y-4 lg:space-y-6">
  <header className="flex items-start justify-between gap-3"><div><Button asChild variant="ghost" size="sm" className="-ms-2 mb-2 h-8 px-2 text-muted-foreground"><Link href="/company"><ArrowRight/>العودة لمساحة الشركة</Link></Button><h1 className="text-xl font-bold tracking-tight lg:text-2xl">ملف مستخدم الشركة</h1><p className="mt-1 text-sm text-muted-foreground">بيانات المستخدم وعضويته داخل الشركة الحالية فقط.</p></div><Button className={registerBrandButtonClass} onClick={()=>void load(true)}><RefreshCw/>تحديث</Button></header>
  <Card className="overflow-hidden border-border/70"><div className="relative h-36 overflow-hidden border-b bg-gradient-to-br from-muted/90 via-background to-[#a57b3d]/15 sm:h-44"><div className="absolute -end-16 -top-20 size-56 rounded-full border border-[#a57b3d]/20 bg-[#a57b3d]/5"/><div className="absolute bottom-5 start-6 text-xs font-medium tracking-[0.18em] text-muted-foreground">MHAMCLOUD PRIMEY</div></div><CardContent className="relative px-5 pb-6 pt-0 sm:px-7"><div className="relative -mt-12 flex flex-col items-center sm:-mt-14"><Avatar className="size-24 border-4 border-background bg-background shadow-md sm:size-28"><AvatarFallback className="bg-foreground text-2xl font-semibold text-background">{initials||"U"}</AvatarFallback></Avatar><div className="mt-3 text-center"><h2 className="text-xl font-bold sm:text-2xl">{name}</h2><div className="mt-1 text-sm text-muted-foreground" dir="ltr">@{user.username||"—"}</div><div className="mt-2 flex justify-center gap-2"><span className="rounded-full border px-2.5 py-1 text-xs">{data.role||"—"}</span><span className="rounded-full border px-2.5 py-1 text-xs">{data.status||"—"}</span></div><div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-muted-foreground">{user.email?<span dir="ltr" className="inline-flex items-center gap-1.5"><Mail className="size-3.5 text-[#a57b3d]"/>{user.email}</span>:null}{profile.phone?<span dir="ltr" className="inline-flex items-center gap-1.5"><Phone className="size-3.5 text-[#a57b3d]"/>{profile.phone}</span>:null}<span className="inline-flex items-center gap-1.5"><CalendarDays className="size-3.5 text-[#a57b3d]"/>عضو منذ: {dt(data.joined_at||data.created_at)}</span></div></div></div></CardContent></Card>
  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 lg:gap-6"><SystemMetricCard title="معرف المستخدم" value={String(user.id||"—")} description="من السجل الحالي" icon={UserRound}/><SystemMetricCard title="معرف العضوية" value={String(data.id||"—")} description="داخل الشركة الحالية" icon={UsersRound}/><Card><CardHeader><CardTitle icon={ShieldCheck} iconPosition="opposite">الدور</CardTitle></CardHeader><CardContent>{data.role||"—"}</CardContent></Card><Card><CardHeader><CardTitle icon={ShieldCheck} iconPosition="opposite">الحالة</CardTitle></CardHeader><CardContent>{data.status||"—"}</CardContent></Card></div>
  <div className="grid gap-4 xl:grid-cols-2 lg:gap-6">
   <Card><CardHeader><CardTitle icon={UserRound}>بيانات المستخدم</CardTitle><CardDescription>الاسم وبيانات الدخول والتواصل المسجلة.</CardDescription></CardHeader><CardContent className="space-y-2"><InfoRow label="الاسم" value={name}/><InfoRow label="اسم المستخدم" value={<span dir="ltr">{user.username||"—"}</span>}/><InfoRow label="البريد الإلكتروني" value={<span dir="ltr">{user.email||"—"}</span>}/><InfoRow label="الهاتف" value={<span dir="ltr">{profile.phone||"—"}</span>}/><InfoRow label="الجوال" value={<span dir="ltr">{profile.mobile||"—"}</span>}/><InfoRow label="واتساب" value={<span dir="ltr">{profile.whatsapp_number||"—"}</span>}/></CardContent></Card>
   <Card><CardHeader><CardTitle icon={ShieldCheck}>عضوية الشركة</CardTitle><CardDescription>البيانات مقصورة على الشركة الحالية فقط.</CardDescription></CardHeader><CardContent className="space-y-2"><InfoRow label="الدور" value={data.role||"—"}/><InfoRow label="الحالة" value={data.status||"—"}/><InfoRow label="عضوية أساسية" value={data.is_primary?"نعم":"لا"}/><InfoRow label="المسمى الوظيفي" value={data.job_title||"—"}/><InfoRow label="القسم" value={data.department||"—"}/><InfoRow label="تاريخ الانضمام" value={<span dir="ltr">{dt(data.joined_at)}</span>}/></CardContent></Card>
   <Card><CardHeader><CardTitle icon={CalendarDays}>السجل التشغيلي</CardTitle></CardHeader><CardContent className="space-y-2"><InfoRow label="تاريخ إنشاء الحساب" value={<span dir="ltr">{dt(user.date_joined)}</span>}/><InfoRow label="آخر دخول" value={<span dir="ltr">{dt(user.last_login)}</span>}/><InfoRow label="إنشاء العضوية" value={<span dir="ltr">{dt(data.created_at)}</span>}/><InfoRow label="آخر تحديث للعضوية" value={<span dir="ltr">{dt(data.updated_at)}</span>}/></CardContent></Card>
   <Card><CardHeader><CardTitle icon={ShieldCheck}>الوصول داخل الشركة</CardTitle></CardHeader><CardContent className="space-y-2"><InfoRow label="حساب فعال" value={user.is_active?"نعم":"لا"}/><InfoRow label="عضوية فعالة" value={data.is_active_membership?"نعم":"لا"}/><InfoRow label="حالة الملف" value={profile.status||"—"}/><InfoRow label="مساحة العمل" value={profile.default_workspace||"COMPANY"}/></CardContent></Card>
  </div>
 </div>
}