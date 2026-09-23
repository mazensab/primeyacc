"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { FileSpreadsheet, Loader2, Printer, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { registerBrandButtonClass, registerOutlineButtonClass } from "@/components/ui/data-register";
import { SystemMetricCard } from "@/components/ui/system-metric-card";

export type CentralRegisterLocale="ar"|"en";
export type CentralRegisterMetric={title:string;value:string|number;description?:string;icon:LucideIcon;custom?:ReactNode};
export type CentralRegisterLabels={refresh:string;exportExcel:string;print:string};
export function CentralRegisterPage(p:{locale:CentralRegisterLocale;labels:CentralRegisterLabels;title:string;subtitle:string;refreshing?:boolean;onRefresh:()=>void;onExcel:()=>void;onPrint:()=>void;metrics:CentralRegisterMetric[];registerTitle:string;registerDescription:string;registerIcon:LucideIcon;toolbar:ReactNode;children:ReactNode;summary?:ReactNode;primaryAction?:ReactNode;footer?:ReactNode}){
 const I=p.registerIcon,dir=p.locale==="ar"?"rtl":"ltr";
 return <div dir={dir} className="space-y-4 lg:space-y-6">
  <div className="flex flex-row items-center justify-between gap-3"><div><h1 className="text-xl font-bold tracking-tight lg:text-2xl">{p.title}</h1><p className="text-muted-foreground mt-1 hidden text-sm lg:block">{p.subtitle}</p></div><div className="flex flex-wrap items-center justify-end gap-2">
   <Button variant="outline" className={registerOutlineButtonClass} onClick={p.onRefresh} disabled={p.refreshing}>{p.refreshing?<Loader2 className="animate-spin"/>:<RefreshCw/>}<span className="hidden lg:inline">{p.labels.refresh}</span></Button>
   <Button variant="outline" className={registerOutlineButtonClass} onClick={p.onExcel}><FileSpreadsheet/><span className="hidden lg:inline">{p.labels.exportExcel}</span></Button>
   <Button className={registerBrandButtonClass} onClick={p.onPrint}><Printer/><span className="hidden lg:inline">{p.labels.print}</span></Button>{p.primaryAction}
  </div></div>
  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 lg:gap-6">{p.metrics.map(m=>m.custom?<div key={m.title}>{m.custom}</div>:<SystemMetricCard key={m.title} title={m.title} value={m.value} description={m.description} icon={m.icon}/>)}</div>
  {p.summary}
  <Card><CardHeader><CardTitle icon={I}>{p.registerTitle}</CardTitle><CardDescription>{p.registerDescription}</CardDescription></CardHeader><CardContent className="space-y-4 p-0"><div className="px-(--card-spacing)">{p.toolbar}</div>{p.children}{p.footer?<div className="space-y-3 px-(--card-spacing) pb-(--card-spacing)">{p.footer}</div>:null}</CardContent></Card>
 </div>
}