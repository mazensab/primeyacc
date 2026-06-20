"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type AnalyticsTargetTrendDirection = "up" | "down" | "neutral";

type AnalyticsTargetCardProps = {
  title: string;
  description?: string;

  current: number;
  target: number;
  unitLabel?: string;
  percentage?: number;

  primaryLabel?: string;
  secondaryLabel?: string;

  trendValue?: string | number;
  trendLabel?: string;
  trendDirection?: AnalyticsTargetTrendDirection;

  icon?: LucideIcon;
  href?: string;
  loading?: boolean;
  className?: string;
};

function clampPercentage(value: number): number {
  if (Number.isNaN(value) || !Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

function formatEnglishNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatTrendValue(value?: string | number): string {
  if (value === undefined || value === null || value === "") return "";

  if (typeof value === "number") {
    const sign = value > 0 ? "+" : value < 0 ? "" : "";
    return `${sign}${new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 2,
    }).format(value)}%`;
  }

  return value;
}

function getTrendClass(direction: AnalyticsTargetTrendDirection) {
  if (direction === "down") return "text-red-600";
  if (direction === "up") return "text-green-600";
  return "text-muted-foreground";
}

function AnalyticsTargetCardInner({
  title,
  description,
  current,
  target,
  unitLabel,
  percentage,
  primaryLabel,
  secondaryLabel,
  trendValue,
  trendLabel,
  trendDirection = "neutral",
  loading = false,
  className,
}: AnalyticsTargetCardProps) {
  const calculatedPercentage =
    typeof percentage === "number" ? percentage : target > 0 ? (current / target) * 100 : 0;

  const safePercentage = clampPercentage(calculatedPercentage);
  const roundedPercentage = Math.round(safePercentage);
  const formattedTrend = formatTrendValue(trendValue);
  const trendClassName = getTrendClass(trendDirection);

  return (
    <Card className={cn("h-full", className)}>
      <CardContent className="flex h-full min-h-[150px] items-center gap-5 p-6">
        {loading ? (
          <>
            <div className="size-[58px] shrink-0 animate-pulse rounded-full bg-muted" />
            <div className="flex-1 space-y-3">
              <div className="h-5 w-44 animate-pulse rounded-full bg-muted" />
              <div className="h-4 w-64 animate-pulse rounded-full bg-muted" />
              <div className="h-4 w-40 animate-pulse rounded-full bg-muted" />
            </div>
          </>
        ) : (
          <>
            <div className="flex size-[58px] shrink-0 items-center justify-center rounded-full border bg-background text-sm font-bold shadow-sm">
              %{roundedPercentage}
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-xl font-bold tracking-tight">{title}</h3>

              {description && (
                <p className="mt-3 max-w-[320px] text-sm leading-6 text-muted-foreground">
                  {description}
                </p>
              )}

              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                <span>{unitLabel || "Target"}</span>

                <span>
                  {secondaryLabel || "Goal"}:{" "}
                  <strong className="font-semibold text-foreground">
                    {formatEnglishNumber(target)}
                  </strong>
                </span>

                <span>
                  {primaryLabel || "Current"}:{" "}
                  <strong className="font-semibold text-foreground">
                    {formatEnglishNumber(current)}
                  </strong>
                </span>
              </div>

              {(formattedTrend || trendLabel) && (
                <div className="mt-2 flex items-center gap-1 text-sm">
                  {formattedTrend && (
                    <span className={cn("inline-flex items-center gap-0.5 font-medium", trendClassName)}>
                      {formattedTrend}
                      {trendDirection !== "neutral" && <ArrowUpRight className="size-3.5" />}
                    </span>
                  )}

                  {trendLabel && (
                    <span className="text-muted-foreground">{trendLabel}</span>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function AnalyticsTargetCard(props: AnalyticsTargetCardProps) {
  if (props.href) {
    return (
      <Link href={props.href} className="block h-full focus:outline-none">
        <AnalyticsTargetCardInner {...props} />
      </Link>
    );
  }

  return <AnalyticsTargetCardInner {...props} />;
}

export type { AnalyticsTargetCardProps, AnalyticsTargetTrendDirection };