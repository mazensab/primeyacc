"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  Clock3,
  ListChecks,
  PlusCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type AnalyticsTaskTone =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "violet";

type AnalyticsTaskStatus = "pending" | "active" | "done" | "warning" | "danger";

type AnalyticsTaskItem = {
  title: string;
  description?: string;
  value?: number | string;
  href?: string;
  icon?: LucideIcon;
  tone?: AnalyticsTaskTone;
  status?: AnalyticsTaskStatus;
  meta?: string;
};

type AnalyticsTaskListProps = {
  title: string;
  description?: string;
  items: AnalyticsTaskItem[];

  emptyLabel?: string;
  actionLabel?: string;
  actionHref?: string;

  icon?: LucideIcon;
  loading?: boolean;
  className?: string;
};

function formatEnglishValue(value?: number | string): string | null {
  if (value === undefined || value === null || value === "") return null;

  if (typeof value === "number") {
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 2,
    }).format(value);
  }

  return value;
}

function getToneClasses(tone: AnalyticsTaskTone = "default") {
  const tones: Record<
    AnalyticsTaskTone,
    {
      checkbox: string;
      meta: string;
      value: string;
    }
  > = {
    default: {
      checkbox: "border-muted-foreground/30 bg-background text-muted-foreground",
      meta: "text-muted-foreground",
      value: "text-muted-foreground",
    },
    success: {
      checkbox:
        "border-green-500/40 bg-green-500/10 text-green-600 dark:text-green-400",
      meta: "text-green-600 dark:text-green-400",
      value: "text-green-600 dark:text-green-400",
    },
    warning: {
      checkbox:
        "border-yellow-500/40 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
      meta: "text-yellow-600 dark:text-yellow-400",
      value: "text-yellow-600 dark:text-yellow-400",
    },
    danger: {
      checkbox:
        "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400",
      meta: "text-red-600 dark:text-red-400",
      value: "text-red-600 dark:text-red-400",
    },
    info: {
      checkbox:
        "border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400",
      meta: "text-blue-600 dark:text-blue-400",
      value: "text-blue-600 dark:text-blue-400",
    },
    violet: {
      checkbox:
        "border-violet-500/40 bg-violet-500/10 text-violet-600 dark:text-violet-400",
      meta: "text-violet-600 dark:text-violet-400",
      value: "text-violet-600 dark:text-violet-400",
    },
  };

  return tones[tone];
}

function getStatusIcon(status: AnalyticsTaskStatus = "pending") {
  if (status === "done") return CheckCircle2;
  if (status === "active") return Clock3;
  if (status === "warning" || status === "danger") return AlertCircle;
  return Circle;
}

function AnalyticsTaskRow({ item }: { item: AnalyticsTaskItem }) {
  const toneClasses = getToneClasses(item.tone);
  const StatusIcon = getStatusIcon(item.status);
  const ItemIcon = item.icon || StatusIcon;
  const formattedValue = formatEnglishValue(item.value);
  const isDone = item.status === "done";

  const content = (
    <div className="group flex min-h-[68px] items-start gap-3 rounded-xl px-1 py-2 transition-colors hover:bg-muted/40">
      <div
        className={cn(
          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border",
          toneClasses.checkbox
        )}
      >
        {isDone ? (
          <CheckCircle2 className="size-3.5" />
        ) : (
          <StatusIcon className="size-3.5" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <p
              className={cn(
                "line-clamp-1 text-sm font-medium leading-5",
                isDone && "text-muted-foreground line-through"
              )}
            >
              {item.title}
            </p>

            {item.description && (
              <p
                className={cn(
                  "mt-1 line-clamp-1 text-xs leading-5 text-muted-foreground",
                  isDone && "line-through"
                )}
              >
                {item.description}
              </p>
            )}
          </div>

          {formattedValue && (
            <span
              className={cn(
                "shrink-0 text-xs font-medium leading-5",
                toneClasses.value
              )}
            >
              {formattedValue}
            </span>
          )}
        </div>

        {(item.meta || item.icon) && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <ItemIcon className={cn("size-3.5", toneClasses.meta)} />
            {item.meta && <span>{item.meta}</span>}
          </div>
        )}
      </div>
    </div>
  );

  if (item.href) {
    return (
      <Link href={item.href} className="block focus:outline-none">
        {content}
      </Link>
    );
  }

  return content;
}

export function AnalyticsTaskList({
  title,
  description,
  items,
  emptyLabel,
  actionLabel,
  actionHref,
  icon: Icon = ListChecks,
  loading = false,
  className,
}: AnalyticsTaskListProps) {
  return (
    <Card className={cn("h-full", className)}>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>{title}</CardTitle>

          {description && <CardDescription>{description}</CardDescription>}
        </div>

        {actionHref && actionLabel ? (
          <Link href={actionHref} className="shrink-0">
            <Button variant="outline" size="sm" className="h-9 rounded-lg">
              <PlusCircle className="size-4" />
              <span>{actionLabel}</span>
            </Button>
          </Link>
        ) : (
          <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-full border">
            <Icon className="size-4" />
          </div>
        )}
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex min-h-[68px] items-start gap-3">
                <div className="size-5 animate-pulse rounded-md bg-muted" />

                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 animate-pulse rounded-full bg-muted" />
                  <div className="h-3 w-52 animate-pulse rounded-full bg-muted" />
                  <div className="h-3 w-24 animate-pulse rounded-full bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length > 0 ? (
          <div className="space-y-2">
            {items.slice(0, 4).map((item, index) => (
              <AnalyticsTaskRow
                key={`${item.title}-${item.meta || index}`}
                item={item}
              />
            ))}
          </div>
        ) : (
          <div className="flex min-h-[220px] items-center justify-center rounded-md border border-dashed bg-background/50 p-6 text-center text-sm text-muted-foreground">
            {emptyLabel || "No tasks available"}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export type {
  AnalyticsTaskItem,
  AnalyticsTaskListProps,
  AnalyticsTaskStatus,
  AnalyticsTaskTone,
};