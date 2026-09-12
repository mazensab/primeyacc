import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface StatCardProps {
  item: {
    title: string;
    value: string;
    change: number;
    icon: ReactNode;
  };
}

export function StatCard({ item }: StatCardProps) {
  const isPositive = item.change >= 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{item.title}</CardTitle>
        <CardAction>
          <span className="text-muted-foreground bg-card flex size-8 items-center justify-center rounded-full border">
            {item.icon}
          </span>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-2">
          <span className="text-3xl font-bold">{item.value}</span>
          <Badge
            variant="outline"
            className={cn(
              "mb-1 flex items-center gap-1 text-xs font-medium",
              isPositive ? "text-success" : "text-destructive"
            )}>
            {isPositive ? "+" : ""}
            {item.change}%
            {isPositive ? (
              <ArrowUpRight className="h-4 w-4" />
            ) : (
              <ArrowDownRight className="h-4 w-4" />
            )}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
