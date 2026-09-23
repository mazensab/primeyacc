"use client";

import * as React from "react";
import { endOfDay, format, startOfDay, subDays } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Activity, AlertTriangle, Banknote, CreditCard, FileText, Loader2, PackageSearch, RefreshCw, ShoppingCart, Wallet } from "lucide-react";
import { toast } from "sonner";
import CalendarDateRangePicker from "@/components/custom-date-range-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CompanyFinancialCard } from "./components/company-financial-card";
import { CompanyRevenueChart } from "./components/company-revenue-chart";
import { CompanyOperationsTable } from "./components/company-operations-table";
import { CompanyTopSelling } from "./components/company-top-selling";
import { CompanyRecentCard } from "./components/company-recent-card";

type Locale = "ar" | "en";
type Obj = Record<string, any>;
const SAR = "/currency/sar.svg";
const C = {
 ar:{title:"لوحة التحكم",sub:"نظرة تشغيلية ومالية على أداء الشركة ضمن نطاق الفرع النشط.",refresh:"تحديث",sales:"إجمالي المبيعات",net:"صافي المبيعات",col:"المقبوضات",exp:"المصروفات",rec:"المستحقات",cash:"الرصيد النقدي",chart:"المبيعات والإيرادات",chartSub:"الحركة خلال الفترة المحددة",ops:"حالة العمليات",inv:"الفواتير",unpaid:"غير المحصل",ret:"المرتجعات",orders:"الطلبات",top:"الأكثر مبيعًا",topSub:"المنتجات والخدمات الأعلى حركة",recent:"أحدث العمليات",recentSub:"آخر الحركات التشغيلية في النطاق الحالي",empty:"لا توجد بيانات للفترة المحددة",error:"تعذر تحميل لوحة الشركة",retry:"إعادة المحاولة",current:"الوضع الحالي",sar:"ريال سعودي",viewAll:"عرض الكل",filter:"ابحث بالمرجع...",columns:"الأعمدة",reference:"المرجع",party:"الطرف",type:"النوع",amount:"المبلغ",previous:"السابق",next:"التالي",of:"من",records:"عمليات",export:"تصدير",excel:"Excel / CSV",print:"طباعة",noResults:"لا توجد نتائج.",latestOps:"أحدث العمليات",latestOpsDesc:"بيانات تشغيلية مباشرة من الشركة",financialSignals:"المؤشرات المالية",receivablesLabel:"المستحقات",cashLabel:"الرصيد النقدي",salesLabel:"صافي المبيعات",collectionsLabel:"المقبوضات"},
 en:{title:"Dashboard",sub:"Operational and financial performance within the active branch scope.",refresh:"Refresh",sales:"Total sales",net:"Net sales",col:"Collections",exp:"Expenses",rec:"Receivables",cash:"Cash balance",chart:"Sales & Revenue",chartSub:"Activity during the selected period",ops:"Operations status",inv:"Invoices",unpaid:"Uncollected",ret:"Returns",orders:"Orders",top:"Top selling",topSub:"Highest moving products and services",recent:"Recent operations",recentSub:"Latest operational activity in the current scope",empty:"No data for the selected period",error:"Could not load company dashboard",retry:"Try again",current:"Current snapshot",sar:"Saudi riyal",viewAll:"View all",filter:"Filter by reference...",columns:"Columns",reference:"Reference",party:"Party",type:"Type",amount:"Amount",previous:"Previous",next:"Next",of:"of",records:"operations",export:"Export",excel:"Excel / CSV",print:"Print",noResults:"No results.",latestOps:"Latest operations",latestOpsDesc:"Live operational data from the company",financialSignals:"Financial signals",receivablesLabel:"Receivables",cashLabel:"Cash balance",salesLabel:"Net sales",collectionsLabel:"Collections"}
} as const;

function obj(v:any):Obj{return v&&typeof v==="object"&&!Array.isArray(v)?v:{}}
function list(v:any):any[]{return Array.isArray(v)?v:[]}
function n(v:any){const x=Number(String(v??0).replace(/,/g,""));return Number.isFinite(x)?x:0}
function get(root:Obj, paths:string[], fallback:any=0){for(const p of paths){let v:any=root,ok=true;for(const k of p.split(".")){if(!v||typeof v!=="object"||!(k in v)){ok=false;break}v=v[k]}if(ok&&v!==null&&v!==undefined&&v!=="")return v}return fallback}
function money(v:any){const value=n(v);const abs=new Intl.NumberFormat("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}).format(Math.abs(value));return value<0?`-${abs}`:abs}
function apiBase(){const r=String(process.env.NEXT_PUBLIC_API_BASE_URL||process.env.NEXT_PUBLIC_API_URL||"").replace(/\/+$/,"");return r.endsWith("/api")?r.slice(0,-4):r}
function rows(payload:any):any[]{if(Array.isArray(payload))return payload;const r=obj(payload);for(const key of ["results","items","records","rows","data","invoices","payments","transactions"]){const v=r[key];if(Array.isArray(v))return v;if(v&&typeof v==="object"){const nested=rows(v);if(nested.length)return nested}}return []}
async function apiGet(path:string,signal:AbortSignal){const r=await fetch(`${apiBase()}${path}`,{credentials:"include",cache:"no-store",signal,headers:{Accept:"application/json","X-Requested-With":"XMLHttpRequest"}});const p=await r.json().catch(()=>({}));if(!r.ok||p?.ok===false||p?.success===false)throw new Error(p?.message||p?.detail||`HTTP ${r.status}`);return p}
function amount(x:any){return n(x?.total_amount??x?.grand_total??x?.net_total??x?.total??x?.amount)}
function dateOf(x:any){return String(x?.issue_date??x?.invoice_date??x?.payment_date??x?.transaction_date??x?.date??x?.created_at??"").slice(0,10)}
async function fetchOverview(path:string,signal:AbortSignal){
 const selected=new URL(path,"http://local").searchParams;
 const qp=new URLSearchParams({page:"1",page_size:"200",ordering:"-created_at"});
 if(selected.get("date_from"))qp.set("date_from",selected.get("date_from")!);
 if(selected.get("date_to"))qp.set("date_to",selected.get("date_to")!);
 const query=`?${qp.toString()}`;
 const orderQp=new URLSearchParams({limit:"200",offset:"0"});
 if(selected.get("date_from"))orderQp.set("date_from",selected.get("date_from")!);
 if(selected.get("date_to"))orderQp.set("date_to",selected.get("date_to")!);
 const ordersQuery=`?${orderQp.toString()}`;
 const returnQp=new URLSearchParams({page:"1",page_size:"200"});
 if(selected.get("date_from"))returnQp.set("date_from",selected.get("date_from")!);
 if(selected.get("date_to"))returnQp.set("date_to",selected.get("date_to")!);
 const returnsQuery=`?${returnQp.toString()}`;
 const [invR,recR,payR,txR,ordersR,returnsR]=await Promise.allSettled([
  apiGet(`/api/company/sales/invoices/${query}`,signal),
  apiGet(`/api/company/treasury/customer-payments/${query}`,signal),
  apiGet(`/api/company/treasury/supplier-payments/${query}`,signal),
  apiGet(`/api/company/treasury/transactions/${query}`,signal),
  apiGet(`/api/company/sales/orders/${ordersQuery}`,signal),
  apiGet(`/api/company/sales/returns/${returnsQuery}`,signal),
 ]);
 if(invR.status==="rejected")throw invR.reason;
 const invoices=rows(invR.value),receipts=recR.status==="fulfilled"?rows(recR.value):[],payments=payR.status==="fulfilled"?rows(payR.value):[],transactions=txR.status==="fulfilled"?rows(txR.value):[],orders=ordersR.status==="fulfilled"?rows(ordersR.value):[],returnsRows=returnsR.status==="fulfilled"?rows(returnsR.value):[];
 const invPayload=obj(invR.value),ordersPayload=ordersR.status==="fulfilled"?obj(ordersR.value):{},returnsPayload=returnsR.status==="fulfilled"?obj(returnsR.value):{};
 const invoiceCount=n(get(invPayload,["count","pagination.count","meta.count","total"],invoices.length));
 const ordersCount=n(get(ordersPayload,["count","pagination.count","meta.count","total"],orders.length));
 const returnsCount=n(get(returnsPayload,["count","pagination.count","meta.count","total"],returnsRows.length));
 const totalSales=invoices.reduce((a,x)=>a+amount(x),0),collected=receipts.reduce((a,x)=>a+amount(x),0),expenses=payments.reduce((a,x)=>a+amount(x),0);
 const unpaid=invoices.filter(x=>["UNPAID","PARTIAL","PENDING"].includes(String(x?.payment_status??x?.status??"").toUpperCase()));
 const byDay=new Map<string,number>();for(const x of invoices){const d=dateOf(x);if(d)byDay.set(d,(byDay.get(d)||0)+amount(x))}
 const collectionsByDay=new Map<string,number>();for(const x of receipts){const d=dateOf(x);if(d)collectionsByDay.set(d,(collectionsByDay.get(d)||0)+amount(x))}
 const dates=[...new Set([...byDay.keys(),...collectionsByDay.keys()])].sort();
 const recentSales=[
  ...invoices.slice(0,4).map(x=>({...x,type:String(x?.type||"INVOICE"),reference:x?.number??x?.invoice_number??x?.reference,party_name:x?.customer_name??x?.party_name,total:amount(x)})),
  ...orders.slice(0,3).map(x=>({...x,type:String(x?.type||"ORDER"),reference:x?.number??x?.order_number??x?.reference,party_name:x?.customer_name??x?.party_name,total:amount(x)})),
  ...returnsRows.slice(0,3).map(x=>({...x,type:String(x?.type||"RETURN"),reference:x?.number??x?.return_number??x?.reference,party_name:x?.customer_name??x?.party_name,total:amount(x)})),
 ];
 return {summary:{total_sales:totalSales,net_sales:totalSales,collections:collected,expenses,cash_balance:collected-expenses,receivables:unpaid.reduce((a,x)=>a+amount(x),0),invoice_count:invoiceCount,unpaid_count:unpaid.length,returns_count:returnsCount,orders_count:ordersCount},series:dates.map(date=>({date,sales:byDay.get(date)||0,collections:collectionsByDay.get(date)||0})),top_products:[],recent_operations:recentSales}
}

export default function CompanyDashboardPage(){
 const [locale,setLocale]=React.useState<Locale>(()=>typeof window!=="undefined"&&window.localStorage.getItem("Mhamcloud-locale")==="en"?"en":"ar");
 const [range,setRange]=React.useState<DateRange|undefined>(()=>({from:startOfDay(subDays(new Date(),27)),to:endOfDay(new Date())}));
 const [data,setData]=React.useState<Obj|null>(null),[loading,setLoading]=React.useState(true),[refreshing,setRefreshing]=React.useState(false),[error,setError]=React.useState("");
 const t=C[locale],dir=locale==="ar"?"rtl":"ltr";
 React.useEffect(()=>{const sync=()=>setLocale(window.localStorage.getItem("Mhamcloud-locale")==="en"?"en":"ar");window.addEventListener("Mhamcloud-locale-changed",sync);window.addEventListener("storage",sync);return()=>{window.removeEventListener("Mhamcloud-locale-changed",sync);window.removeEventListener("storage",sync)}},[]);
 const load=React.useCallback(async(silent=false)=>{const controller=new AbortController();try{if(!silent)setLoading(true);setRefreshing(true);setError("");const q=new URLSearchParams();if(range?.from)q.set("date_from",format(range.from,"yyyy-MM-dd"));if(range?.to)q.set("date_to",format(range.to,"yyyy-MM-dd"));setData(await fetchOverview(`/api/company/dashboard/?${q}`,controller.signal));if(silent)toast.success(t.refresh)}catch(e){const m=e instanceof Error?e.message:t.error;setError(m);if(silent)toast.error(m)}finally{setLoading(false);setRefreshing(false)}},[range,t.error,t.refresh]);
 React.useEffect(()=>{const timer=window.setTimeout(()=>{void load()},0);return()=>window.clearTimeout(timer)},[load]);
 if(loading&&!data)return <div dir={dir} className="space-y-4 lg:space-y-6"><div className="flex items-center justify-between"><Skeleton className="h-9 w-72"/><Skeleton className="h-9 w-80"/></div><div className="grid gap-4 xl:grid-cols-8 lg:gap-6"><Skeleton className="h-[330px] xl:col-span-4"/><Skeleton className="h-[330px] xl:col-span-4"/></div><div className="grid gap-4 xl:grid-cols-3 lg:gap-6"><Skeleton className="h-[520px]"/><Skeleton className="h-[520px] xl:col-span-2"/></div></div>;
 if(error&&!data)return <Card dir={dir}><CardContent className="flex min-h-72 flex-col items-center justify-center gap-4 text-center"><AlertTriangle className="size-9 text-destructive"/><div><CardTitle>{t.error}</CardTitle><p className="mt-2 text-sm text-muted-foreground">{error}</p></div><Button onClick={()=>void load()}>{t.retry}</Button></CardContent></Card>;
 const d=obj(data),s=obj(get(d,["summary","totals","overview"],{}));
 const sales=get(s,["total_sales","sales_total","gross_sales","sales"]),returns=get(s,["sales_returns","returns_total","returns"]),net=get(s,["net_sales","sales_net"],n(sales)-n(returns)),collections=get(s,["collections","collected","receipts_total","paid_total"]),expenses=get(s,["expenses","expenses_total","payments_total"]),receivables=get(s,["receivables","outstanding","unpaid_total","open_receivables"]),cash=get(s,["cash_balance","treasury_balance","balance"]);
 const series=list(get(d,["chart.series","series","sales_series","daily_sales"],[])).map((v,i)=>{const x=obj(v);return{date:String(x.date||x.day||x.label||i+1),sales:n(x.sales??x.net_sales??x.total??x.amount??x.value),collections:n(x.collections??x.collected??0)}});
 const top=list(get(d,["top_products","best_selling","top_selling"],[])).slice(0,5),recent=list(get(d,["latest","recent","recent_operations","latest_operations"],[])).slice(0,8);
 const ops=[[t.inv,get(s,["invoice_count","invoices_count","invoices"],0),FileText],[t.unpaid,get(s,["unpaid_count","open_receivables_count","unpaid_invoices"],0),CreditCard],[t.ret,get(s,["returns_count","sales_returns_count"],0),FileText],[t.orders,get(s,["orders_count","sales_orders_count"],0),ShoppingCart]] as const;
 const operationRows=recent.map((v,i)=>{const x=obj(v);return{id:String(x.id||i+1),reference:String(x.number||x.reference||x.title||`#${i+1}`),party:String(x.customer_name||x.party_name||""),type:String(x.type||x.status||""),amount:n(x.total||x.amount)}});
 const stableMetric=(value:any)=>({current:n(value),previous:n(value),delta:0,change_percent:null,direction:"stable" as const});
 const operationEvents={invoices:stableMetric(get(s,["invoice_count","invoices_count","invoices"],0)),unpaid:stableMetric(get(s,["unpaid_count","open_receivables_count","unpaid_invoices"],0)),returns:stableMetric(get(s,["returns_count","sales_returns_count"],0)),orders:stableMetric(get(s,["orders_count","sales_orders_count"],0))};
 const topRows=top.map((v,i)=>{const x=obj(v);return{id:String(x.id||i+1),name:String(x.name||x.product_name||x.title||`#${i+1}`),secondary:String(x.quantity||x.qty||x.count||"")}});
 const recentRows=operationRows.slice(0,6).map(r=>({id:r.id,title:r.reference,secondary:r.party||r.type,badge:r.type}));
 return <div dir={dir} className="space-y-4 lg:space-y-6">
  <div className="flex flex-row items-center justify-between gap-3"><div><h1 className="text-xl font-bold tracking-tight lg:text-2xl">{t.title}</h1><p className="text-muted-foreground mt-1 hidden text-sm lg:block">{t.sub}</p></div><div className="flex items-center gap-2"><div className="grow"><CalendarDateRangePicker value={range} onChange={setRange} locale={locale}/></div><Button onClick={()=>void load(true)} disabled={refreshing}>{refreshing?<Loader2 className="animate-spin"/>:<RefreshCw/>}<span className="hidden lg:inline">{t.refresh}</span></Button></div></div>
  <div className="gap-4 lg:gap-6 space-y-4 md:grid md:grid-cols-2 lg:space-y-0 xl:grid-cols-8"><div className="md:col-span-4"><CompanyRevenueChart data={series} totals={{sales:n(sales),collections:n(collections)}} defaultSeries="sales" labels={{title:t.chart,description:`${range?.from?format(range.from,"yyyy-MM-dd"):""} — ${range?.to?format(range.to,"yyyy-MM-dd"):""}`,sales:t.sales,collections:t.col,sar:t.sar,noData:t.empty}}/></div><div className="md:col-span-4"><div className="grid h-full auto-rows-fr grid-cols-1 gap-4 md:grid-cols-2 lg:gap-6"><CompanyFinancialCard title={t.net} value={net} description={t.current} sarLabel={t.sar} icon={CreditCard}/><CompanyFinancialCard title={t.sales} value={sales} description={t.current} sarLabel={t.sar} icon={ShoppingCart}/><CompanyFinancialCard title={t.col} value={collections} description={t.current} sarLabel={t.sar} icon={Wallet}/><CompanyFinancialCard title={t.exp} value={expenses} description={t.current} sarLabel={t.sar} icon={Banknote}/></div></div></div>
  <div className="gap-4 lg:gap-6 space-y-4 lg:space-y-0 xl:grid xl:grid-cols-3">
   <div className="xl:col-span-1"><CompanyTopSelling rows={topRows} href="/company/products" labels={{title:t.top,description:t.topSub,viewAll:t.viewAll,noData:t.empty}}/></div>
   <div className="xl:col-span-2"><CompanyOperationsTable rows={operationRows} events={operationEvents} labels={{title:t.ops,description:t.recentSub,invoices:t.inv,unpaid:t.unpaid,returns:t.ret,orders:t.orders,filter:t.filter,columns:t.columns,reference:t.reference,party:t.party,type:t.type,amount:t.amount,previous:t.previous,next:t.next,of:t.of,records:t.records,export:t.export,excel:t.excel,print:t.print,noResults:t.noResults,sar:t.sar}}/></div>
  </div>
    <div className="grid items-start gap-4 lg:gap-6 xl:grid-cols-3">
   <CompanyRecentCard title={t.latestOps} description={t.latestOpsDesc} rows={recentRows} href="/company/sales" viewAll={t.viewAll} noData={t.empty} icon={Activity}/>
   <Card><CardHeader><CardTitle icon={Wallet} iconPosition="opposite">{t.financialSignals}</CardTitle></CardHeader><CardContent className="space-y-3">{[[t.receivablesLabel,receivables],[t.cashLabel,cash],[t.salesLabel,net],[t.collectionsLabel,collections]].map(([label,value])=><div key={String(label)} className="hover:bg-muted flex items-center justify-between rounded-md border px-4 py-3"><span className="text-sm">{label}</span><span className="font-display text-lg tabular-nums">{money(value)}</span></div>)}</CardContent></Card>
   <CompanyRecentCard title={t.top} description={t.topSub} rows={topRows.map(r=>({id:r.id,title:r.name,secondary:r.secondary}))} href="/company/products" viewAll={t.viewAll} noData={t.empty} icon={PackageSearch}/>
  </div>
 </div>
}
