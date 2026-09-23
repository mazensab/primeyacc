import Link from "next/link";
import { ChevronRight,PackageSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card,CardAction,CardContent,CardDescription,CardHeader,CardTitle } from "@/components/ui/card";
import { Tooltip,TooltipContent,TooltipTrigger } from "@/components/ui/tooltip";
type Row={id:string;name:string;secondary:string};
export function CompanyTopSelling({rows,href,labels}:{rows:Row[];href:string;labels:Record<string,string>}){
 return <Card className="h-full"><CardHeader><CardTitle icon={PackageSearch} iconPosition="opposite">{labels.title}</CardTitle><CardDescription>{labels.description}</CardDescription><CardAction><Tooltip><TooltipTrigger asChild><Button size="icon" variant="outline" asChild><Link href={href}><ChevronRight className="rtl:rotate-180"/></Link></Button></TooltipTrigger><TooltipContent>{labels.viewAll}</TooltipContent></Tooltip></CardAction></CardHeader><CardContent className="space-y-4">{rows.length?rows.map(r=><div key={r.id} className="hover:bg-muted flex items-center gap-4 rounded-md border px-4 py-3"><span className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-md"><PackageSearch className="size-5"/></span><div className="min-w-0"><div className="truncate font-medium">{r.name}</div><div className="text-muted-foreground text-xs">{r.secondary}</div></div></div>):<div className="text-muted-foreground flex min-h-[310px] items-center justify-center text-sm">{labels.noData}</div>}</CardContent></Card>
}