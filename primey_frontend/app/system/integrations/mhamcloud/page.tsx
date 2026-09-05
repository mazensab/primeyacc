"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity, AlertTriangle, ArrowLeft, CheckCircle2, Clock3, Database,
  Download, Eye, FileClock, MoreVertical, Play, PlugZap, Printer,
  RefreshCcw, RotateCcw, SearchX, Settings2, ShieldCheck, XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DataRegisterDatePicker, DataRegisterEmptyState, DataRegisterSearch,
  DataRegisterToolbar, registerBrandButtonClass, registerOutlineButtonClass,
} from "@/components/ui/data-register";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { SystemKpiCard } from "@/components/ui/system-kpi-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { API_PATHS } from "@/lib/api/endpoints";
import { downloadExcelReport } from "@/lib/excel-report";
import { openPrintReport } from "@/lib/print-report";

type Locale = "ar" | "en";
type JsonRecord = Record<string, unknown>;
type ConnectionSettings = {
  enabled: boolean; base_url: string; timeout_seconds: number;
  client_id_configured: boolean; client_secret_configured: boolean;
  username_configured: boolean; password_configured: boolean;
};
type SyncRun = {
  id: string; trigger: string; status: string;
  queued_at?: string | null; started_at?: string | null; completed_at?: string | null;
  requested_count?: number; changed_count?: number; applied_count?: number;
  unchanged_count?: number; failure_count?: number; safe_error_message?: string;
};
type SyncStatus = {
  enabled: boolean; sync_running: boolean;
  connection: { credentials_ready: boolean; last_test_ok?: boolean | null; last_test_at?: string | null };
  companies: { total: number; baseline_synced: number; applied: number; unchanged: number; failed: number };
  latest_state?: { started_at?: string | null; completed_at?: string | null; requested_count?: number; changed_count?: number; failure_count?: number };
};
type DomainStatus = { domain: string; status: string; source_count?: number | null; error?: string };
type CompanySync = {
  business_id: string; company_id?: number | null; company_name: string; company_code?: string;
  status: string; domain_count: number; successful_domain_count: number; domain_statuses: DomainStatus[];
  safe_error_code?: string; safe_error_message?: string; last_attempt_at?: string | null;
};
type PagePayload<T> = { count: number; page: number; page_size: number; pages: number; results: T[] };

const i18n = {
  ar: {
    title:"تكامل MhamCloud", desc:"إدارة المزامنة مع مهام القديم وحالة كل شركة والأخطاء وسجل التشغيل وبيانات الاتصال.",
    back:"مركز التكاملات", refresh:"تحديث", run:"تشغيل المزامنة الآن", running:"المزامنة تعمل",
    settings:"إعدادات الاتصال", total:"إجمالي الشركات", synced:"متزامنة", unchanged:"بدون تغيير",
    failed:"فاشلة", changed:"آخر تغييرات", connection:"حالة الاتصال", connected:"متصل",
    disconnected:"خطأ اتصال", notTested:"لم يُختبر", companies:"سجل الشركات",
    companiesDesc:"كل شركة في سطر مستقل مع حالة المزامنة وآخر خطأ والتقدم.",
    search:"ابحث باسم الشركة أو Business ID أو Primey ID أو الخطأ...", all:"كل الحالات",
    baseline:"مزامنة أساسية", applied:"تم التطبيق", from:"من", to:"إلى", reset:"إعادة ضبط",
    company:"الشركة", business:"Business ID", primey:"Primey ID", status:"الحالة", progress:"التقدم",
    last:"آخر محاولة", error:"آخر خطأ", actions:"الإجراءات", details:"عرض التفاصيل", retry:"إعادة مزامنة الشركة",
    domains:"المجالات", noError:"لا يوجد خطأ", runs:"سجل عمليات المزامنة", trigger:"المشغّل",
    started:"بدأ", finished:"انتهى", requested:"المطلوب", failures:"الأخطاء", noRows:"لا توجد نتائج",
    noRowsDesc:"لا توجد شركات مطابقة.", noRuns:"لا توجد عمليات مزامنة بعد.", excel:"Excel", print:"طباعة",
    enabled:"تفعيل التكامل", base:"Base URL", timeout:"Timeout (seconds)", clientId:"Client ID",
    clientSecret:"Client Secret", username:"Username", password:"Password", configured:"محفوظ",
    missing:"غير محفوظ", blank:"اتركه فارغًا للإبقاء على القيمة الحالية", save:"حفظ",
    saveTest:"حفظ واختبار", test:"اختبار الاتصال", saved:"تم حفظ إعدادات الاتصال.",
    testOk:"تم الاتصال بـMhamCloud بنجاح.", queued:"تم إرسال المزامنة للعمل في الخلفية.",
    retryQueued:"تم إرسال إعادة مزامنة الشركة للعمل في الخلفية.", loadError:"تعذر تحميل بيانات التكامل.",
  },
  en: {
    title:"MhamCloud Integration", desc:"Manage legacy MhamCloud sync, company status, errors, run history, and credentials.",
    back:"Integrations Center", refresh:"Refresh", run:"Run sync now", running:"Sync running",
    settings:"Connection settings", total:"Total companies", synced:"Synced", unchanged:"Unchanged",
    failed:"Failed", changed:"Latest changed", connection:"Connection", connected:"Connected",
    disconnected:"Connection error", notTested:"Not tested", companies:"Companies register",
    companiesDesc:"One row per company with sync status, progress, and latest error.",
    search:"Search company, Business ID, Primey ID, or error...", all:"All statuses",
    baseline:"Baseline synced", applied:"Applied", from:"From", to:"To", reset:"Reset",
    company:"Company", business:"Business ID", primey:"Primey ID", status:"Status", progress:"Progress",
    last:"Last attempt", error:"Last error", actions:"Actions", details:"View details", retry:"Retry company",
    domains:"Domains", noError:"No error", runs:"Sync runs", trigger:"Trigger",
    started:"Started", finished:"Finished", requested:"Requested", failures:"Failures", noRows:"No results",
    noRowsDesc:"No companies match the current filters.", noRuns:"No sync runs yet.", excel:"Excel", print:"Print",
    enabled:"Integration enabled", base:"Base URL", timeout:"Timeout (seconds)", clientId:"Client ID",
    clientSecret:"Client Secret", username:"Username", password:"Password", configured:"Configured",
    missing:"Not configured", blank:"Leave blank to keep the current value", save:"Save",
    saveTest:"Save & test", test:"Test connection", saved:"Connection settings saved.",
    testOk:"MhamCloud connection succeeded.", queued:"Background sync queued.",
    retryQueued:"Company retry queued.", loadError:"Could not load integration data.",
  },
} as const;

function localeNow(): Locale {
  if (typeof document === "undefined") return "ar";
  return document.documentElement.lang?.startsWith("en") ? "en" : "ar";
}
function url(path: string) {
  return `${String(process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "")}${path}`;
}
function cookie(name: string) {
  if (typeof document === "undefined") return "";
  return document.cookie.split(";").map(v => v.trim()).find(v => v.startsWith(`${name}=`))?.split("=").slice(1).join("=") || "";
}
async function csrf() {
  await fetch(url(API_PATHS.auth.csrf), { credentials:"include", cache:"no-store" });
}
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const method = String(init?.method || "GET").toUpperCase();
  const write = !["GET","HEAD","OPTIONS"].includes(method);
  if (write) await csrf();
  const headers = new Headers(init?.headers || {});
  headers.set("Accept","application/json");
  if (write) {
    headers.set("Content-Type","application/json");
    const token = decodeURIComponent(cookie("csrftoken"));
    if (token) headers.set("X-CSRFToken", token);
  }
  const response = await fetch(url(path), { ...init, headers, credentials:"include", cache:"no-store" });
  const payload = await response.json().catch(() => ({})) as JsonRecord;
  if (!response.ok || payload.ok === false) throw new Error(String(payload.message || `Request failed (${response.status})`));
  return payload as T;
}
function data<T>(payload: unknown): T { return (payload as {data?:T}).data as T; }
function date(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value); if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(d);
}
function badge(value: string) {
  const s = String(value || "UNKNOWN").toUpperCase();
  const cls = s === "FAILED" ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
    : ["APPLIED","SUCCESS"].includes(s) ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : ["UNCHANGED","BASELINE_SYNCED"].includes(s) ? "border-sky-200 bg-sky-50 text-sky-700"
    : ["RUNNING","QUEUED"].includes(s) ? "border-amber-200 bg-amber-50 text-amber-700"
    : "border-border bg-muted/40 text-muted-foreground";
  return <Badge variant="outline" className={cls}>{s}</Badge>;
}
function esc(v: unknown) {
  return String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
}

export default function SystemMhamCloudIntegrationPage() {
  const locale = localeNow(); const t = i18n[locale];
  const [status,setStatus] = React.useState<SyncStatus|null>(null);
  const [settings,setSettings] = React.useState<ConnectionSettings|null>(null);
  const [companies,setCompanies] = React.useState<CompanySync[]>([]);
  const [runs,setRuns] = React.useState<SyncRun[]>([]);
  const [loading,setLoading] = React.useState(true); const [refreshing,setRefreshing] = React.useState(false);
  const [error,setError] = React.useState(""); const [search,setSearch] = React.useState("");
  const [filter,setFilter] = React.useState("all"); const [from,setFrom] = React.useState(""); const [to,setTo] = React.useState("");
  const [detail,setDetail] = React.useState<CompanySync|null>(null); const [settingsOpen,setSettingsOpen] = React.useState(false);
  const [busy,setBusy] = React.useState("");
  const [form,setForm] = React.useState({enabled:true,base_url:"https://mhamcloud.sa/connector/api",timeout_seconds:"30",client_id:"",client_secret:"",username:"",password:""});

  const allPages = React.useCallback(async <T,>(path:string) => {
    const sep = path.includes("?") ? "&" : "?";
    const first = data<PagePayload<T>>(await request(`${path}${sep}page=1&page_size=200`));
    const rows = [...(first?.results || [])];
    for (let p=2;p<=Number(first?.pages||1);p+=1) rows.push(...(data<PagePayload<T>>(await request(`${path}${sep}page=${p}&page_size=200`))?.results||[]));
    return rows;
  },[]);

  const load = React.useCallback(async (silent=false) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError("");
    try {
      const [s,c,cs,rs] = await Promise.all([
        request(API_PATHS.systemMhamCloud.status), request(API_PATHS.systemMhamCloud.settings),
        allPages<CompanySync>(API_PATHS.systemMhamCloud.companies), allPages<SyncRun>(API_PATHS.systemMhamCloud.runs),
      ]);
      const nextS=data<SyncStatus>(s), nextC=data<ConnectionSettings>(c);
      setStatus(nextS); setSettings(nextC); setCompanies(cs); setRuns(rs);
      setForm(v=>({...v,enabled:Boolean(nextC?.enabled),base_url:String(nextC?.base_url||v.base_url),timeout_seconds:String(nextC?.timeout_seconds||30)}));
    } catch(e) { const m=e instanceof Error?e.message:t.loadError; setError(m); toast.error(m); }
    finally { setLoading(false); setRefreshing(false); }
  },[allPages,t.loadError]);
  React.useEffect(()=>{void load(false)},[load]);

  const visible = React.useMemo(()=>companies.filter(row=>{
    const q=search.trim().toLowerCase();
    if(filter!=="all"&&row.status!==filter)return false;
    if(q&&!([row.company_name,row.business_id,row.company_id,row.company_code,row.safe_error_message].map(v=>String(v??"")).join(" ").toLowerCase().includes(q)))return false;
    const d=row.last_attempt_at?.slice(0,10)||""; if(from&&(!d||d<from))return false; if(to&&(!d||d>to))return false;
    return true;
  }),[companies,filter,from,search,to]);

  async function testConnection() {
    setBusy("test"); try { await request(API_PATHS.systemMhamCloud.testConnection,{method:"POST",body:"{}"}); toast.success(t.testOk); await load(true); }
    catch(e){toast.error(e instanceof Error?e.message:t.loadError)} finally{setBusy("")}
  }
  async function save(withTest=false) {
    setBusy("save"); try {
      const payload:JsonRecord={enabled:form.enabled,base_url:form.base_url,timeout_seconds:Number(form.timeout_seconds)};
      for(const key of ["client_id","client_secret","username","password"] as const) if(form[key].trim()) payload[key]=form[key].trim();
      await request(API_PATHS.systemMhamCloud.settings,{method:"PATCH",body:JSON.stringify(payload)});
      setForm(v=>({...v,client_id:"",client_secret:"",username:"",password:""})); toast.success(t.saved);
      if(withTest) await testConnection(); else await load(true);
    } catch(e){toast.error(e instanceof Error?e.message:t.loadError)} finally{setBusy("")}
  }
  async function runSync() {
    if(!window.confirm(locale==="ar"?"تشغيل المزامنة لكل الشركات المؤهلة في الخلفية؟":"Run background sync for all eligible companies?"))return;
    setBusy("run"); try{await request(API_PATHS.systemMhamCloud.runSync,{method:"POST",body:"{}"});toast.success(t.queued);await load(true)}
    catch(e){toast.error(e instanceof Error?e.message:t.loadError)}finally{setBusy("")}
  }
  async function retry(row:CompanySync) {
    if(!window.confirm(locale==="ar"?"إعادة مزامنة هذه الشركة فقط؟":"Retry this company only?"))return;
    setBusy(row.business_id); try{await request(API_PATHS.systemMhamCloud.retry(row.business_id),{method:"POST",body:"{}"});toast.success(t.retryQueued);await load(true)}
    catch(e){toast.error(e instanceof Error?e.message:t.loadError)}finally{setBusy("")}
  }

  function excel(){downloadExcelReport({locale,title:t.title,subtitle:t.companiesDesc,filename:`primey-mhamcloud-${new Date().toISOString().slice(0,10)}.xls`,sections:[{title:t.companies,headers:[t.company,t.business,t.primey,t.status,t.progress,t.last,t.error],rows:visible.map(r=>[{value:r.company_name},{value:r.business_id},{value:r.company_id??""},{value:r.status},{value:`${r.successful_domain_count}/${r.domain_count}`},{value:date(r.last_attempt_at)},{value:r.safe_error_message||t.noError}])}]})}
  function print(){const html=`<section class="report-section"><h2>${esc(t.companies)}</h2><table class="data"><thead><tr><th>${esc(t.company)}</th><th>${esc(t.business)}</th><th>${esc(t.primey)}</th><th>${esc(t.status)}</th><th>${esc(t.error)}</th></tr></thead><tbody>${visible.map(r=>`<tr><td>${esc(r.company_name)}</td><td>${esc(r.business_id)}</td><td>${esc(r.company_id??"—")}</td><td>${esc(r.status)}</td><td>${esc(r.safe_error_message||t.noError)}</td></tr>`).join("")}</tbody></table></section>`;if(!openPrintReport({locale,title:t.title,tableHtml:html,recordsCount:visible.length}))toast.error("Popup blocked")}

  if(loading)return <main className="mx-auto max-w-[1600px] space-y-6 p-6"><Skeleton className="h-24"/><Skeleton className="h-[600px]"/></main>;
  const synced=(status?.companies.baseline_synced||0)+(status?.companies.applied||0)+(status?.companies.unchanged||0);
  const connection=status?.connection.last_test_ok===true?t.connected:status?.connection.last_test_ok===false?t.disconnected:t.notTested;

  return <main dir={locale==="ar"?"rtl":"ltr"} className="mx-auto w-full max-w-[1600px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div><Link href="/system/integrations" className="mb-3 inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4 rtl:rotate-180"/>{t.back}</Link>
        <div className="flex gap-3"><span className="flex size-11 items-center justify-center rounded-full border bg-white/80 text-[#a57b3d] shadow-sm dark:bg-white/[0.06]"><Database className="h-5 w-5"/></span><div><h1 className="text-2xl font-bold">{t.title}</h1><p className="mt-1 max-w-3xl text-sm text-muted-foreground">{t.desc}</p></div></div>
      </div>
      <div className="flex flex-wrap gap-2"><Button variant="outline" className={registerOutlineButtonClass} onClick={()=>void load(true)}><RefreshCcw className={refreshing?"h-4 w-4 animate-spin":"h-4 w-4"}/>{t.refresh}</Button><Button variant="outline" className={registerOutlineButtonClass} onClick={()=>setSettingsOpen(true)}><Settings2 className="h-4 w-4"/>{t.settings}</Button><Button className={registerBrandButtonClass} disabled={Boolean(status?.sync_running)||busy==="run"} onClick={()=>void runSync()}><Play className="h-4 w-4"/>{status?.sync_running?t.running:t.run}</Button></div>
    </div>
    {error?<Alert variant="destructive"><AlertTriangle className="h-4 w-4"/><AlertTitle>{t.loadError}</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>:null}

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <SystemKpiCard title={t.total} value={status?.companies.total||companies.length} description={t.companiesDesc} icon={Database}/>
      <SystemKpiCard title={t.synced} value={synced} description={t.companiesDesc} icon={CheckCircle2}/>
      <SystemKpiCard title={t.unchanged} value={status?.companies.unchanged||0} description={t.companiesDesc} icon={ShieldCheck}/>
      <SystemKpiCard title={t.failed} value={status?.companies.failed||0} description={t.companiesDesc} icon={XCircle}/>
      <SystemKpiCard title={t.changed} value={status?.latest_state?.changed_count||0} description={date(status?.latest_state?.completed_at)} icon={Activity}/>
      <SystemKpiCard title={t.connection} value={connection} description={date(status?.connection.last_test_at)} icon={PlugZap}/>
      <SystemKpiCard title={t.requested} value={status?.latest_state?.requested_count||0} description={date(status?.latest_state?.started_at)} icon={FileClock}/>
      <SystemKpiCard title={t.failures} value={status?.latest_state?.failure_count||0} description={date(status?.latest_state?.completed_at)} icon={AlertTriangle}/>
    </div>

    <Card className="gap-0 rounded-lg border bg-card py-0 shadow-none"><CardHeader className="border-b py-5"><div className="flex items-start justify-between gap-3"><div><CardTitle className="text-base">{t.connection}</CardTitle><CardDescription>{settings?.base_url||form.base_url}</CardDescription></div><div className="flex gap-2">{badge(status?.connection.last_test_ok===true?"SUCCESS":status?.connection.last_test_ok===false?"FAILED":"UNKNOWN")}<Button size="sm" variant="outline" className={registerOutlineButtonClass} onClick={()=>void testConnection()}><PlugZap className="h-4 w-4"/>{t.test}</Button></div></div></CardHeader><CardContent className="grid gap-4 py-5 sm:grid-cols-2 lg:grid-cols-4">{[[t.clientId,settings?.client_id_configured],[t.clientSecret,settings?.client_secret_configured],[t.username,settings?.username_configured],[t.password,settings?.password_configured]].map(([label,ok])=><div key={String(label)} className="rounded-lg border bg-muted/20 p-4"><p className="font-semibold">{String(label)}</p><p className="mt-1 text-sm text-muted-foreground">{ok?t.configured:t.missing}</p></div>)}</CardContent></Card>

    <Card className="gap-0 overflow-hidden rounded-lg border bg-card py-0 shadow-none">
      <CardHeader className="border-b py-5"><div className="space-y-4"><div className="flex justify-between gap-3"><div><CardTitle className="text-base">{t.companies}</CardTitle><CardDescription>{t.companiesDesc}</CardDescription></div><div className="flex gap-2"><Button size="sm" variant="outline" className={registerOutlineButtonClass} onClick={excel}><Download className="h-4 w-4"/>{t.excel}</Button><Button size="sm" variant="outline" className={registerOutlineButtonClass} onClick={print}><Printer className="h-4 w-4"/>{t.print}</Button></div></div>
        <DataRegisterToolbar className="flex flex-col gap-2 xl:flex-row"><DataRegisterSearch value={search} onChange={setSearch} placeholder={t.search} className="flex-1"/><Select value={filter} onValueChange={setFilter}><SelectTrigger className="h-9 bg-background xl:w-[180px]"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">{t.all}</SelectItem><SelectItem value="BASELINE_SYNCED">{t.baseline}</SelectItem><SelectItem value="APPLIED">{t.applied}</SelectItem><SelectItem value="UNCHANGED">{t.unchanged}</SelectItem><SelectItem value="FAILED">{t.failed}</SelectItem></SelectContent></Select><DataRegisterDatePicker label={t.from} value={from} onChange={setFrom} locale={locale}/><DataRegisterDatePicker label={t.to} value={to} onChange={setTo} locale={locale}/><Button variant="outline" className={registerOutlineButtonClass} onClick={()=>{setSearch("");setFilter("all");setFrom("");setTo("")}}><RotateCcw className="h-4 w-4"/>{t.reset}</Button></DataRegisterToolbar>
      </div></CardHeader>
      {visible.length?<Table variant="register" minWidth={1200}><TableHeader><TableRow><TableHead sticky="start">{t.company}</TableHead><TableHead>{t.business}</TableHead><TableHead>{t.primey}</TableHead><TableHead>{t.status}</TableHead><TableHead>{t.progress}</TableHead><TableHead>{t.last}</TableHead><TableHead>{t.error}</TableHead><TableHead sticky="end">{t.actions}</TableHead></TableRow></TableHeader><TableBody>{visible.map(r=>{const p=r.domain_count?Math.round(r.successful_domain_count/r.domain_count*100):(r.status==="FAILED"?0:100);return <TableRow key={r.business_id}><TableCell sticky="start"><p className="max-w-[250px] truncate font-semibold">{r.company_name||"—"}</p></TableCell><TableCell dir="ltr">{r.business_id}</TableCell><TableCell dir="ltr">{r.company_id??"—"}</TableCell><TableCell>{badge(r.status)}</TableCell><TableCell><div className="w-[150px]"><div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>{r.successful_domain_count}/{r.domain_count}</span><span>{p}%</span></div><Progress value={p} className="h-1.5"/></div></TableCell><TableCell dir="ltr">{date(r.last_attempt_at)}</TableCell><TableCell><p className={r.safe_error_message?"max-w-[300px] truncate text-red-600":"max-w-[300px] truncate text-muted-foreground"} title={r.safe_error_message||t.noError}>{r.safe_error_message||t.noError}</p></TableCell><TableCell sticky="end"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4"/></Button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem onClick={()=>setDetail(r)}><Eye className="h-4 w-4"/>{t.details}</DropdownMenuItem><DropdownMenuSeparator/><DropdownMenuItem disabled={busy===r.business_id||Boolean(status?.sync_running)} onClick={()=>void retry(r)}><RefreshCcw className="h-4 w-4"/>{t.retry}</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell></TableRow>})}</TableBody></Table>:<DataRegisterEmptyState title={t.noRows} description={t.noRowsDesc} icon={SearchX}/>}
    </Card>

    <Card className="gap-0 overflow-hidden rounded-lg border bg-card py-0 shadow-none"><CardHeader className="border-b py-5"><CardTitle className="text-base">{t.runs}</CardTitle></CardHeader>{runs.length?<Table variant="register" minWidth={1000}><TableHeader><TableRow><TableHead>Run ID</TableHead><TableHead>{t.trigger}</TableHead><TableHead>{t.status}</TableHead><TableHead>{t.started}</TableHead><TableHead>{t.finished}</TableHead><TableHead>{t.requested}</TableHead><TableHead>{t.changed}</TableHead><TableHead>{t.failures}</TableHead></TableRow></TableHeader><TableBody>{runs.slice(0,100).map(r=><TableRow key={r.id}><TableCell dir="ltr" className="font-mono text-xs">{r.id}</TableCell><TableCell>{r.trigger}</TableCell><TableCell>{badge(r.status)}</TableCell><TableCell dir="ltr">{date(r.started_at||r.queued_at)}</TableCell><TableCell dir="ltr">{date(r.completed_at)}</TableCell><TableCell>{r.requested_count??0}</TableCell><TableCell>{r.changed_count??0}</TableCell><TableCell>{r.failure_count??0}</TableCell></TableRow>)}</TableBody></Table>:<DataRegisterEmptyState title={t.noRuns} description={t.noRuns} icon={Clock3}/>}</Card>

    <Sheet open={Boolean(detail)} onOpenChange={o=>!o&&setDetail(null)}><SheetContent side={locale==="ar"?"left":"right"} className="w-full overflow-y-auto sm:max-w-xl"><SheetHeader><SheetTitle>{detail?.company_name}</SheetTitle><SheetDescription>{t.domains}</SheetDescription></SheetHeader>{detail?<div className="space-y-4 px-4 pb-6">{detail.safe_error_message?<Alert variant="destructive"><AlertTriangle className="h-4 w-4"/><AlertTitle>{detail.safe_error_code||t.failed}</AlertTitle><AlertDescription>{detail.safe_error_message}</AlertDescription></Alert>:null}{detail.domain_statuses.map(d=><div key={d.domain} className="rounded-lg border p-3"><div className="flex justify-between gap-3"><span className="font-medium">{d.domain}</span>{badge(d.status)}</div>{d.error?<p className="mt-2 text-xs text-red-600">{d.error}</p>:null}</div>)}<Button className={`${registerBrandButtonClass} w-full`} onClick={()=>void retry(detail)}><RefreshCcw className="h-4 w-4"/>{t.retry}</Button></div>:null}</SheetContent></Sheet>

    <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}><SheetContent side={locale==="ar"?"left":"right"} className="w-full overflow-y-auto sm:max-w-xl"><SheetHeader><SheetTitle>{t.settings}</SheetTitle><SheetDescription>{locale==="ar"?"القيم السرية لا يتم إرجاعها من الخادم؛ يظهر فقط هل هي محفوظة.":"Secret values are never returned; only configured state is shown."}</SheetDescription></SheetHeader><div className="space-y-4 px-4 pb-6"><div className="flex items-center justify-between rounded-lg border p-4"><Label htmlFor="enabled">{t.enabled}</Label><Switch id="enabled" checked={form.enabled} onCheckedChange={v=>setForm(f=>({...f,enabled:v}))}/></div><div><Label>{t.base}</Label><Input dir="ltr" value={form.base_url} onChange={e=>setForm(f=>({...f,base_url:e.target.value}))}/></div><div><Label>{t.timeout}</Label><Input dir="ltr" type="number" value={form.timeout_seconds} onChange={e=>setForm(f=>({...f,timeout_seconds:e.target.value}))}/></div>{([["client_id",t.clientId,settings?.client_id_configured],["client_secret",t.clientSecret,settings?.client_secret_configured],["username",t.username,settings?.username_configured],["password",t.password,settings?.password_configured]] as const).map(([key,label,ok])=><div key={key}><div className="mb-2 flex justify-between"><Label>{label}</Label><Badge variant="outline">{ok?t.configured:t.missing}</Badge></div><Input dir="ltr" type={key==="password"||key==="client_secret"?"password":"text"} autoComplete="new-password" value={form[key]} placeholder={ok?t.blank:""} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))}/></div>)}<div className="grid gap-2 sm:grid-cols-3"><Button variant="outline" className={registerOutlineButtonClass} disabled={Boolean(busy)} onClick={()=>void testConnection()}><PlugZap className="h-4 w-4"/>{t.test}</Button><Button variant="outline" className={registerOutlineButtonClass} disabled={Boolean(busy)} onClick={()=>void save(false)}><Settings2 className="h-4 w-4"/>{t.save}</Button><Button className={registerBrandButtonClass} disabled={Boolean(busy)} onClick={()=>void save(true)}><CheckCircle2 className="h-4 w-4"/>{t.saveTest}</Button></div></div></SheetContent></Sheet>
  </main>;
}
