import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type SystemMetricCardProps = {
  title: string;
  value: number | string;
  description?: string;
  icon: LucideIcon;
  href?: string;
  className?: string;
};

function formatMetricValue(value: number | string) {
  if (typeof value === "number") {
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 0,
    }).format(value);
  }
  return value;
}

function SystemMetricCardBody({
  title,
  value,
  description,
  icon: Icon,
  className,
}: SystemMetricCardProps) {
  return (
    <Card className={cn("h-full", className)}>
      <CardHeader>
        <CardTitle icon={Icon} iconPosition="opposite">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="font-display text-2xl lg:text-3xl tabular-nums">
          {formatMetricValue(value)}
        </div>
        {description ? (
          <p className="text-muted-foreground text-xs">{description}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function SystemMetricCard(props: SystemMetricCardProps) {
  if (props.href) {
    return (
      <Link href={props.href} className="block h-full focus:outline-none">
        <SystemMetricCardBody {...props} />
      </Link>
    );
  }

  return <SystemMetricCardBody {...props} />;
}
