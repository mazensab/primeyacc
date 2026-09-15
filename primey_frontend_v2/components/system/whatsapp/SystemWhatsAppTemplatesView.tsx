"use client";

import * as React from "react";
import {
  ArrowUpDown,
  CheckCircle2,
  FileSpreadsheet,
  Inbox,
  Loader2,
  Printer,
  RefreshCw,
  RotateCcw,
  Shapes,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { API_PATHS } from "@/lib/api/endpoints";
import { useAuth } from "@/components/providers/AuthProvider";
import { canManageSystemWhatsApp } from "@/lib/permissions";
import { downloadExcelReport, type ExcelReportSection } from "@/lib/excel-report";
import { openPrintTableReport, type PrintReportTableSection } from "@/lib/print-report";
import SystemWhatsAppModuleNav from "@/components/system/whatsapp/SystemWhatsAppModuleNav";
import {
  DataRegisterEmptyState,
  DataRegisterSearch,
  DataRegisterToolbar,
  registerBrandButtonClass,
  registerOutlineButtonClass,
} from "@/components/ui/data-register";
import { DataRegisterResultCount, DataRegisterTableFrame } from "@/components/ui/data-register-table";
import { SystemMetricCard } from "@/components/ui/system-metric-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Locale = "ar" | "en";
type ApiRecord = Record<string, unknown>;
type Row = {id:string;company:string;code:string;name:string;category:string;status:string;language:string;body:string;createdAt:string|null};
type StatusFilter="all"|"DRAFT"|"ACTIVE"|"INACTIVE"|"ARCHIVED";
type CategoryFilter="all"|"GENERAL"|"SALES"|"PURCHASES"|"TREASURY"|"POS"|"ACCOUNTING"|"INVENTORY"|"CUSTOMER_SERVICE";
type SortKey="newest"|"oldest"|"name"|"status";

const translations={
 ar:{title:"قوالب واتساب",subtitle:"مراجعة قوالب واتساب المسجلة وإدارة حالتها مع أدوات V2 الموحدة.",refresh:"تحديث",excel:"تصدير Excel",print:"طباعة",total:"إجمالي القوالب",active:"نشطة",inactive:"غير نشطة",archived:"مؤرشفة",live:"من واجهات النظام الحقيقية",tableTitle:"سجل قوالب واتساب",tableDesc:"بحث وتصفية وترتيب وتحديث حالات القوالب من مكان واحد.",search:"ابحث باسم القالب أو الكود أو الشركة أو المحتوى...",all:"الكل",newest:"الأحدث",oldest:"الأقدم",nameSort:"الاسم",statusSort:"الحالة",reset:"إعادة ضبط",company:"الشركة",template:"القالب",category:"التصنيف",status:"الحالة",language:"اللغة",body:"المحتوى",actions:"الإجراءات",activate:"تفعيل",disable:"تعطيل",archive:"أرشفة",noData:"لا توجد قوالب",noDataDesc:"ستظهر قوالب واتساب هنا عند توفرها من API.",noResults:"لا توجد نتائج مطابقة",noResultsDesc:"غيّر البحث أو الفلاتر.",error:"تعذر تحميل قوالب واتساب",tryAgain:"إعادة المحاولة",showing:"عرض",of:"من",rows:"قالب",updated:"تم تحديث حالة القالب.",generatedAt:"تم الإنشاء في"},
 en:{title:"WhatsApp Templates",subtitle:"Review registered WhatsApp templates and manage their status with unified V2 tools.",refresh:"Refresh",excel:"Export Excel",print:"Print",total:"Total templates",active:"Active",inactive:"Inactive",archived:"Archived",live:"From real system APIs",tableTitle:"WhatsApp template register",tableDesc:"Search, filter, sort, and update template states from one place.",search:"Search template, code, company, or body...",all:"All",newest:"Newest",oldest:"Oldest",nameSort:"Name",statusSort:"Status",reset:"Reset",company:"Company",template:"Template",category:"Category",status:"Status",language:"Language",body:"Body",actions:"Actions",activate:"Activate",disable:"Disable",archive:"Archive",noData:"No templates",noDataDesc:"WhatsApp templates will appear here when returned by the API.",noResults:"No matching results",noResultsDesc:"Change search or filters.",error:"Could not load WhatsApp templates",tryAgain:"Try again",showing:"Showing",of:"of",rows:"templates",updated:"Template status updated.",generatedAt:"Generated at"}
} as const;

function asRecord(v:unknown):ApiRecord{return v&&typeof v==="object"&&!Array.isArray(v)?v as ApiRecord:{}}
function text(v:unknown,f=""){return v==null?f:String(v).trim()||f}
function num(v:unknown,f=0){const n=Number(String(v??"").replace(/,/g,""));return Number.isFinite(n)?n:f}
function getLocale():Locale{if(typeof window==="undefined")return"ar";return window.localStorage.getItem("Mhamcloud-locale")==="en"?"en":"ar"}
function base(){const raw=(process.env.NEXT_PUBLIC_API_BASE_URL||process.env.NEXT_PUBLIC_API_URL||"").replace(/\/+$/,"");return raw.endsWith("/api")?raw.slice(0,-4):raw}
function url(path:string,params?:URLSearchParams){const q=params?.toString();return`${base()}${path}${q?`?${q}`:""}`}
function cookie(name:string){if(typeof document==="undefined")return"";const p=document.cookie.split("; ").find(x=>x.startsWith(`${name}=`));return p?decodeURIComponent(p.split("=").slice(1).join("=")):""}
async function csrf(){let token=cookie("csrftoken");if(token)return token;await fetch(url("/api/auth/csrf/"),{credentials:"include",cache:"no-store"}).catch(()=>null);return cookie("csrftoken")}
async function request<T>(path:string,init:RequestInit={},params?:URLSearchParams):Promise<T>{const method=(init.method||"GET").toUpperCase();const headers:Record<string,string>={Accept:"application/json","X-Requested-With":"XMLHttpRequest",...(init.body?{"Content-Type":"application/json"}:{}),...(init.headers as Record<string,string>|undefined)};if(method!=="GET"&&method!=="HEAD"){const token=await csrf();if(token)headers["X-CSRFToken"]=token}const response=await fetch(url(path,params),{...init,method,headers,credentials:"include",cache:"no-store"});const raw=await response.text();let payload:unknown={};try{payload=raw?JSON.parse(raw):{}}catch{payload={}}const r=asRecord(payload);if(!response.ok||r.success===false)throw new Error(text(r.message)||text(r.detail)||text(r.error)||`Request failed with status ${response.status}`);return payload as T}
function list(payload:unknown){if(Array.isArray(payload))return payload;const r=asRecord(payload),d=asRecord(r.data);for(const v of[r.results,r.items,r.records,r.templates,r.data,d.results,d.items,d.records])if(Array.isArray(v))return v;return[]}
function total(payload:unknown,f:number){const r=asRecord(payload),d=asRecord(r.data);return num(r.count??r.total??r.total_count??d.count??d.total,f)}
function norm(v:unknown):Row{const r=asRecord(v),c=asRecord(r.company);return{id:text(r.id),company:text(c.name||c.company_name||r.company_name,"—"),code:text(r.code,"—"),name:text(r.name,"—"),category:text(r.category,"GENERAL").toUpperCase(),status:text(r.status,"DRAFT").toUpperCase(),language:text(r.language,"—"),body:text(r.body,"—"),createdAt:text(r.created_at)||null}}
function formatDate(v:string|null,l:Locale){if(!v)return"—";const d=new Date(v);return Number.isNaN(d.getTime())?v:new Intl.DateTimeFormat(l==="ar"?"ar-SA":"en-US",{dateStyle:"medium",timeStyle:"short"}).format(d)}

export default function SystemWhatsAppTemplatesView(){
 const session=useAuth(),canManage=canManageSystemWhatsApp(session);
 const[locale,setLocale]=React.useState<Locale>("ar"),[rows,setRows]=React.useState<Row[]>([]),[apiTotal,setApiTotal]=React.useState(0),[loading,setLoading]=React.useState(true),[refreshing,setRefreshing]=React.useState(false),[changing,setChanging]=React.useState<string|null>(null),[error,setError]=React.useState(""),[search,setSearch]=React.useState(""),[status,setStatus]=React.useState<StatusFilter>("all"),[category,setCategory]=React.useState<CategoryFilter>("all"),[sort,setSort]=React.useState<SortKey>("newest");const t=translations[locale],dir=locale==="ar"?"rtl":"ltr";
 React.useEffect(()=>{const f=()=>setLocale(getLocale());f();window.addEventListener("storage",f);window.addEventListener("Mhamcloud-locale-changed",f);return()=>{window.removeEventListener("storage",f);window.removeEventListener("Mhamcloud-locale-changed",f)}},[]);
 const load=React.useCallback(async(silent=false)=>{try{if(!silent)setLoading(true);setRefreshing(true);setError("");const p=await request<unknown>(API_PATHS.systemWhatsApp.templates,{},new URLSearchParams({limit:"200"}));const x=list(p).map(norm);setRows(x);setApiTotal(total(p,x.length));}catch(e){const m=e instanceof Error?e.message:t.error;setError(m);if(silent)toast.error(m)}finally{setLoading(false);setRefreshing(false)}},[t.error]);
 React.useEffect(()=>{void load()},[load]);
 const filtered=React.useMemo(()=>{const q=search.trim().toLowerCase();const x=rows.filter(r=>(!q||[r.company,r.code,r.name,r.body,r.category,r.status,r.language].join(" ").toLowerCase().includes(q))&&(status==="all"||r.status===status)&&(category==="all"||r.category===category));return[...x].sort((a,b)=>sort==="oldest"?String(a.createdAt).localeCompare(String(b.createdAt)):sort==="name"?a.name.localeCompare(b.name):sort==="status"?a.status.localeCompare(b.status):String(b.createdAt).localeCompare(String(a.createdAt)))},[rows,search,status,category,sort]);
 const has=!!search.trim()||status!=="all"||category!=="all"||sort!=="newest";const reset=()=>{setSearch("");setStatus("all");setCategory("all");setSort("newest")};
 async function change(id:string,next:string){if(!canManage)return;setChanging(id);try{await request(API_PATHS.systemWhatsApp.templateStatus(id),{method:"POST",body:JSON.stringify({status:next})});toast.success(t.updated);await load(true)}catch(e){toast.error(e instanceof Error?e.message:t.error)}finally{setChanging(null)}}
 const reportRows=()=>filtered.map(r=>[r.company,r.code,r.name,r.category,r.status,r.language,r.body,formatDate(r.createdAt,locale)]);
 function excel(){if(!filtered.length)return toast.error(t.noData);const s:ExcelReportSection={title:t.tableTitle,headers:[t.company,"Code",t.template,t.category,t.status,t.language,t.body,"Created"],rows:reportRows().map(r=>r.map(v=>({value:v,type:"text" as const})))};downloadExcelReport({locale,title:t.title,subtitle:t.subtitle,filename:`Mhamcloud-system-whatsapp-templates-${new Date().toISOString().slice(0,10)}.xls`,generatedAtLabel:t.generatedAt,sections:[s]})}
 function print(){if(!filtered.length)return toast.error(t.noData);const s:PrintReportTableSection={title:t.tableTitle,columns:[t.company,"Code",t.template,t.category,t.status,t.language,t.body,"Created"].map(label=>({label,type:"text" as const})),rows:reportRows()};openPrintTableReport({locale,title:t.title,subtitle:t.subtitle,sections:[s],recordsCount:filtered.length,recordsLabel:t.rows,generatedAtLabel:t.generatedAt})}
 if(loading)return <div className="space-y-6"><Skeleton className="h-10 w-72"/><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{[1,2,3,4].map(x=><Skeleton key={x} className="h-28"/>)}</div><Skeleton className="h-[500px]"/></div>;
 if(error)return <Card dir={dir} className="mx-auto max-w-3xl border-destructive/30"><CardHeader className="text-center"><TriangleAlert className="mx-auto size-8 text-destructive"/><CardTitle>{t.error}</CardTitle><CardDescription>{error}</CardDescription></CardHeader><CardContent className="text-center"><Button onClick={()=>void load(true)}><RefreshCw className="size-4"/>{t.tryAgain}</Button></CardContent></Card>;
 const active=rows.filter(r=>r.status==="ACTIVE").length,inactive=rows.filter(r=>["INACTIVE","DRAFT"].includes(r.status)).length,archived=rows.filter(r=>r.status==="ARCHIVED").length;
 return <div dir={dir} className="space-y-6"><SystemWhatsAppModuleNav/><header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><h1 className="text-xl font-bold tracking-tight lg:text-2xl">{t.title}</h1><p className="mt-1 hidden text-sm text-muted-foreground lg:block">{t.subtitle}</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" className={registerOutlineButtonClass} onClick={()=>void load(true)} disabled={refreshing}>{refreshing?<Loader2 className="size-4 animate-spin"/>:<RefreshCw className="size-4"/>}{t.refresh}</Button><Button className={registerBrandButtonClass} onClick={excel}><FileSpreadsheet className="size-4"/>{t.excel}</Button><Button className={registerBrandButtonClass} onClick={print}><Printer className="size-4"/>{t.print}</Button></div></header>
 <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><SystemMetricCard title={t.total} value={apiTotal||rows.length} description={t.live} icon={Shapes}/><SystemMetricCard title={t.active} value={active} description={t.live} icon={CheckCircle2}/><SystemMetricCard title={t.inactive} value={inactive} description={t.live} icon={XCircle}/><SystemMetricCard title={t.archived} value={archived} description={t.live} icon={Inbox}/></div>
 <Card><CardHeader><CardTitle>{t.tableTitle}</CardTitle><CardDescription>{t.tableDesc}</CardDescription></CardHeader><CardContent className="space-y-4"><DataRegisterToolbar className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between"><div className="flex min-w-0 flex-1 flex-col gap-2 md:flex-row md:flex-wrap md:items-center"><DataRegisterSearch value={search} onChange={setSearch} placeholder={t.search} className="w-full md:min-w-[320px] md:flex-1"/><Select value={status} onValueChange={v=>setStatus(v as StatusFilter)}><SelectTrigger className="h-9 bg-background shadow-none md:w-[150px]"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">{t.all}</SelectItem>{["DRAFT","ACTIVE","INACTIVE","ARCHIVED"].map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select><Select value={category} onValueChange={v=>setCategory(v as CategoryFilter)}><SelectTrigger className="h-9 bg-background shadow-none md:w-[180px]"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">{t.all}</SelectItem>{["GENERAL","SALES","PURCHASES","TREASURY","POS","ACCOUNTING","INVENTORY","CUSTOMER_SERVICE"].map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div><div className="flex flex-wrap items-center gap-2"><Select value={sort} onValueChange={v=>setSort(v as SortKey)}><SelectTrigger className="h-9 bg-background shadow-none sm:w-[160px]"><ArrowUpDown className="size-4"/><SelectValue/></SelectTrigger><SelectContent><SelectItem value="newest">{t.newest}</SelectItem><SelectItem value="oldest">{t.oldest}</SelectItem><SelectItem value="name">{t.nameSort}</SelectItem><SelectItem value="status">{t.statusSort}</SelectItem></SelectContent></Select><Button variant="outline" className="h-9 bg-background shadow-none" onClick={reset}><RotateCcw className="size-4"/>{t.reset}</Button></div></DataRegisterToolbar>
 <DataRegisterTableFrame><Table><TableHeader><TableRow><TableHead>{t.company}</TableHead><TableHead>{t.template}</TableHead><TableHead>{t.category}</TableHead><TableHead>{t.status}</TableHead><TableHead>{t.language}</TableHead><TableHead>{t.body}</TableHead><TableHead>{t.actions}</TableHead></TableRow></TableHeader><TableBody>{filtered.length?filtered.map(r=><TableRow key={r.id}><TableCell className="h-[68px] px-4"><div className="font-medium">{r.company}</div></TableCell><TableCell className="h-[68px] px-4"><div className="font-medium">{r.name}</div><div className="text-xs text-muted-foreground">{r.code}</div></TableCell><TableCell className="h-[68px] px-4">{r.category}</TableCell><TableCell className="h-[68px] px-4"><Badge variant="outline">{r.status}</Badge></TableCell><TableCell className="h-[68px] px-4">{r.language}</TableCell><TableCell className="h-[68px] max-w-[360px] px-4"><p className="line-clamp-2 whitespace-normal">{r.body}</p></TableCell><TableCell className="h-[68px] px-4">{canManage?<div className="flex flex-wrap gap-1.5"><Button size="sm" variant="outline" className={registerOutlineButtonClass} disabled={changing===r.id} onClick={()=>void change(r.id,"ACTIVE")}>{t.activate}</Button><Button size="sm" variant="outline" className={registerOutlineButtonClass} disabled={changing===r.id} onClick={()=>void change(r.id,"INACTIVE")}>{t.disable}</Button><Button size="sm" variant="outline" className={registerOutlineButtonClass} disabled={changing===r.id} onClick={()=>void change(r.id,"ARCHIVED")}>{t.archive}</Button></div>:<span className="text-xs text-muted-foreground">—</span>}</TableCell></TableRow>):<TableRow><TableCell colSpan={7} className="p-0"><DataRegisterEmptyState icon={Inbox} title={has?t.noResults:t.noData} description={has?t.noResultsDesc:t.noDataDesc} showReset={has} resetLabel={t.reset} onReset={reset}/></TableCell></TableRow>}</TableBody></Table></DataRegisterTableFrame><DataRegisterResultCount showingLabel={t.showing} showingCount={filtered.length} ofLabel={t.of} totalCount={apiTotal||rows.length} rowsLabel={t.rows}/></CardContent></Card></div>
}
