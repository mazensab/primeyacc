import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card,CardAction,CardContent,CardDescription,CardHeader,CardTitle } from "@/components/ui/card";
import { Tooltip,TooltipContent,TooltipTrigger } from "@/components/ui/tooltip";
type Row={id:string;title:string;secondary:string;badge?:string};
export function CompanyRecentCard({title,description,rows,href,viewAll,noData,icon:Icon}:{title:string;description:string;rows:Row[];href:string;viewAll:string;noData:string;icon:LucideIcon}){
 return <Card className="h-full"><CardHeader><CardTitle icon={Icon} iconPosition="opposite">{title}</CardTitle><CardDescription>{description}</CardDescription><CardAction><Tooltip><TooltipTrigger asChild><Button size="icon" variant="outline" asChild><Link href={href}><ChevronRight className="rtl:rotate-180"/></Link></Button></TooltipTrigger><TooltipContent>{viewAll}</TooltipContent></Tooltip></CardAction></CardHeader><CardContent className="space-y-3">{rows.length?rows.map(r=><div key={r.id} className="hover:bg-muted flex items-center justify-between gap-3 rounded-md border px-4 py-3"><div className="min-w-0"><div className="truncate text-sm font-medium">{r.title}</div><div className="text-muted-foreground mt-0.5 truncate text-xs">{r.secondary||"—"}</div></div>{r.badge?<span className="text-muted-foreground shrink-0 text-xs">{r.badge}</span>:null}</div>):<div className="text-muted-foreground flex min-h-40 items-center justify-center text-sm">{noData}</div>}</CardContent></Card>
}