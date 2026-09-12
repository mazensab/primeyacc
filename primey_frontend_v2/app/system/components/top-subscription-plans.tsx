import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Layers3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type PlanRow = {
  plan_id: number | string;
  name: string;
  code: string;
  subscriptions: number;
  subscription_value: string | number;
};

type Props = {
  rows: PlanRow[];
  labels: {
    title: string;
    description: string;
    subscriptions: string;
    sar: string;
    viewAll: string;
    noData: string;
  };
};

function money(value: unknown) {
  const parsed = Number(String(value ?? 0).replace(/,/g, ""));
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    Number.isFinite(parsed) ? parsed : 0,
  );
}

export function TopSubscriptionPlans({ rows, labels }: Props) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle icon={Layers3} iconPosition="opposite">{labels.title}</CardTitle>
        <CardDescription>{labels.description}</CardDescription>
        <CardAction>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="outline" asChild>
                <Link href="/system/plans">
                  <ChevronRight className="rtl:rotate-180" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{labels.viewAll}</TooltipContent>
          </Tooltip>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.length ? (
          rows.map((plan) => (
            <Link
              href={`/system/plans/${plan.plan_id}`}
              key={`${plan.plan_id}-${plan.code}`}
              className="hover:bg-muted flex items-center justify-between gap-3 rounded-md border px-4 py-3"
            >
              <div className="flex min-w-0 items-center gap-4">
                <span className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-md">
                  <Layers3 className="size-5" />
                </span>
                <div className="min-w-0">
                  <div className="truncate font-medium">{plan.name || plan.code || "—"}</div>
                  <div className="text-muted-foreground text-xs">
                    {plan.subscriptions} {labels.subscriptions}
                  </div>
                </div>
              </div>
              <div className="inline-flex shrink-0 items-center gap-1 text-sm text-green-600">
                <Image src="/currency/sar.svg" width={14} height={14} alt={labels.sar} />
                {money(plan.subscription_value)}
              </div>
            </Link>
          ))
        ) : (
          <div className="text-muted-foreground flex min-h-[310px] items-center justify-center text-sm">
            {labels.noData}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
