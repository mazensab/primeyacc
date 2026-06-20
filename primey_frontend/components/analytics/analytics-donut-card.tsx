"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Circle, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type AnalyticsDonutItem = {
  label: string;
  value: number;
  description?: string;
  icon?: LucideIcon;
  className?: string;
};

type AnalyticsDonutCardProps = {
  title: string;
  description?: string;
  items: AnalyticsDonutItem[];

  totalLabel?: string;
  emptyLabel?: string;
  centerLabel?: string;

  icon?: LucideIcon;
  href?: string;
  loading?: boolean;
  className?: string;

  actionLabel?: string;
  onActionClick?: () => void;
};

const SEGMENT_COLORS = [
  "#18181b",
  "#52525b",
  "#a1a1aa",
  "#d4d4d8",
  "#27272a",
  "#71717a",
  "#b4b4be",
  "#e4e4e7",
];

const SEGMENT_CLASSES = [
  "text-zinc-950",
  "text-zinc-600",
  "text-zinc-400",
  "text-zinc-300",
  "text-zinc-800",
  "text-zinc-500",
  "text-zinc-400",
  "text-zinc-200",
];

function formatEnglishNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value);
}

function normalizeDonutItems(items: AnalyticsDonutItem[]) {
  const normalizedItems = items.map((item) => ({
    ...item,
    value: Number.isFinite(item.value) ? Math.max(0, item.value) : 0,
  }));

  const positiveItems = normalizedItems.filter((item) => item.value > 0);

  if (positiveItems.length) {
    return positiveItems;
  }

  return normalizedItems.slice(0, 4);
}

function buildConicGradient(items: AnalyticsDonutItem[], total: number): string {
  if (!items.length || total <= 0) {
    return "conic-gradient(#e4e4e7 0deg 360deg)";
  }

  let currentDegree = 0;

  const segments = items.map((item, index) => {
    const value = Math.max(0, item.value || 0);
    const degree = (value / total) * 360;
    const start = currentDegree;
    const end = currentDegree + degree;

    currentDegree = end;

    const color = SEGMENT_COLORS[index % SEGMENT_COLORS.length];

    return `${color} ${start}deg ${end}deg`;
  });

  return `conic-gradient(${segments.join(", ")})`;
}

function AnalyticsDonutCardInner({
  title,
  description,
  items,
  totalLabel,
  emptyLabel,
  centerLabel,
  loading = false,
  className,
  actionLabel,
  onActionClick,
}: AnalyticsDonutCardProps) {
  const normalizedItems = normalizeDonutItems(items);
  const total = normalizedItems.reduce((sum, item) => sum + item.value, 0);
  const hasData = total > 0;
  const gradient = buildConicGradient(normalizedItems, total);

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">{title}</h3>

          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 rounded-lg"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onActionClick?.();
          }}
        >
          <Download className="size-4" />
          <span>{actionLabel || "Export"}</span>
        </Button>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="space-y-10">
            <div className="mx-auto size-[170px] animate-pulse rounded-full bg-muted" />

            <div className="grid grid-cols-4 gap-5">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="space-y-2">
                  <div className="h-3 w-16 animate-pulse rounded-full bg-muted" />
                  <div className="h-6 w-12 animate-pulse rounded-full bg-muted" />
                </div>
              ))}
            </div>
          </div>
        ) : hasData ? (
          <div className="space-y-10">
            <div className="flex items-center justify-center">
              <div
                className="relative flex size-[170px] items-center justify-center rounded-full"
                style={{ background: gradient }}
                aria-label={title}
              >
                <div className="absolute inset-[42px] rounded-full bg-card" />

                <div className="relative z-10 text-center">
                  <p className="text-3xl font-semibold tracking-tight">
                    {formatEnglishNumber(total)}
                  </p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {centerLabel || totalLabel || "Leads"}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-5">
              {normalizedItems.slice(0, 4).map((item, index) => {
                const colorClass =
                  item.className ||
                  SEGMENT_CLASSES[index % SEGMENT_CLASSES.length];

                return (
                  <div
                    key={`${item.label}-${index}`}
                    className="space-y-2 text-center"
                  >
                    <div className="flex items-center justify-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <Circle
                        className={cn("size-2.5 fill-current", colorClass)}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>

                    <p className="text-xl font-semibold tracking-tight">
                      {formatEnglishNumber(item.value)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex min-h-[260px] items-center justify-center text-center text-sm text-muted-foreground">
            {emptyLabel || "No data available"}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AnalyticsDonutCard(props: AnalyticsDonutCardProps) {
  if (props.href) {
    return (
      <Link href={props.href} className="block h-full focus:outline-none">
        <AnalyticsDonutCardInner {...props} />
      </Link>
    );
  }

  return <AnalyticsDonutCardInner {...props} />;
}

export type { AnalyticsDonutCardProps, AnalyticsDonutItem };