"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Layers3 } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type AnalyticsPipelineItemTone =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "violet";

type AnalyticsPipelineItem = {
  label: string;
  value: number;
  description?: string;
  href?: string;
  icon?: LucideIcon;
  tone?: AnalyticsPipelineItemTone;
};

type AnalyticsPipelineCardProps = {
  title: string;
  description?: string;
  items: AnalyticsPipelineItem[];

  totalLabel?: string;
  emptyLabel?: string;

  icon?: LucideIcon;
  href?: string;
  loading?: boolean;
  className?: string;
};

const STAGE_COLORS = [
  {
    dot: "bg-[var(--chart-1)]",
    progress: "[&>div]:bg-[var(--chart-1)]",
  },
  {
    dot: "bg-[var(--chart-2)]",
    progress: "[&>div]:bg-[var(--chart-2)]",
  },
  {
    dot: "bg-[var(--chart-3)]",
    progress: "[&>div]:bg-[var(--chart-3)]",
  },
  {
    dot: "bg-[var(--chart-4)]",
    progress: "[&>div]:bg-[var(--chart-4)]",
  },
  {
    dot: "bg-[var(--chart-5)]",
    progress: "[&>div]:bg-[var(--chart-5)]",
  },
];

function formatEnglishNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value);
}

function normalizeItems(items: AnalyticsPipelineItem[]) {
  return items.slice(0, 5).map((item) => ({
    ...item,
    value: Number.isFinite(item.value) ? Math.max(0, item.value) : 0,
  }));
}

function AnalyticsPipelineCardInner({
  title,
  description,
  items,
  totalLabel,
  emptyLabel,
  icon: Icon = Layers3,
  loading = false,
  className,
}: AnalyticsPipelineCardProps) {
  const stages = normalizeItems(items);
  const totalCount = stages.reduce((sum, stage) => sum + stage.value, 0);
  const hasRows = stages.length > 0;

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{title}</CardTitle>

            {description && <CardDescription>{description}</CardDescription>}
          </div>

          <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-full border">
            <Icon className="size-4" />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="space-y-6">
            <div className="h-4 w-full animate-pulse rounded-full bg-muted" />

            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="h-3 w-3 animate-pulse rounded-full bg-muted" />

                  <div className="flex flex-1 items-center justify-between">
                    <div className="space-y-2">
                      <div className="h-4 w-28 animate-pulse rounded-full bg-muted" />
                      <div className="h-3 w-36 animate-pulse rounded-full bg-muted" />
                    </div>

                    <div className="flex w-24 items-center gap-2">
                      <div className="h-2 flex-1 animate-pulse rounded-full bg-muted" />
                      <div className="h-3 w-8 animate-pulse rounded-full bg-muted" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : hasRows ? (
          <>
            <TooltipProvider>
              <div className="mb-6 flex h-4 w-full overflow-hidden rounded-full bg-muted">
                {stages.map((stage, index) => {
                  const color = STAGE_COLORS[index % STAGE_COLORS.length];
                  const width =
                    totalCount > 0 ? (stage.value / totalCount) * 100 : 0;

                  return (
                    <Tooltip key={`${stage.label}-${index}`}>
                      <TooltipTrigger asChild>
                        <div
                          className={cn("h-full", color.dot)}
                          style={{ width: `${width}%` }}
                        />
                      </TooltipTrigger>

                      <TooltipContent>
                        <div className="text-sm">
                          <p className="font-medium">{stage.label}</p>
                          <p className="text-muted-foreground text-xs">
                            {formatEnglishNumber(stage.value)}{" "}
                            {totalLabel || ""}
                          </p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </TooltipProvider>

            <div className="space-y-4">
              {stages.map((stage, index) => {
                const color = STAGE_COLORS[index % STAGE_COLORS.length];
                const countPercentage =
                  totalCount > 0 ? (stage.value / totalCount) * 100 : 0;

                const row = (
                  <div className="flex items-center gap-4">
                    <div className={cn("h-3 w-3 rounded-full", color.dot)} />

                    <div className="flex flex-1 items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{stage.label}</p>

                        <p className="text-muted-foreground truncate text-xs">
                          {stage.description ||
                            `${formatEnglishNumber(stage.value)} ${
                              totalLabel || ""
                            }`}
                        </p>
                      </div>

                      <div className="flex w-24 items-center gap-2">
                        <Progress
                          value={countPercentage}
                          className={cn("h-2", color.progress)}
                        />

                        <span className="text-muted-foreground w-10 text-right text-xs">
                          {Math.round(countPercentage)}%
                        </span>
                      </div>
                    </div>
                  </div>
                );

                if (stage.href) {
                  return (
                    <Link
                      key={`${stage.label}-${index}`}
                      href={stage.href}
                      className="block focus:outline-none"
                    >
                      {row}
                    </Link>
                  );
                }

                return <div key={`${stage.label}-${index}`}>{row}</div>;
              })}
            </div>
          </>
        ) : (
          <div className="flex min-h-[220px] items-center justify-center rounded-md border border-dashed bg-background/50 p-6 text-center text-sm text-muted-foreground">
            {emptyLabel || "No pipeline data available"}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AnalyticsPipelineCard(props: AnalyticsPipelineCardProps) {
  if (props.href) {
    return (
      <Link href={props.href} className="block h-full focus:outline-none">
        <AnalyticsPipelineCardInner {...props} />
      </Link>
    );
  }

  return <AnalyticsPipelineCardInner {...props} />;
}

export type {
  AnalyticsPipelineCardProps,
  AnalyticsPipelineItem,
  AnalyticsPipelineItemTone,
};