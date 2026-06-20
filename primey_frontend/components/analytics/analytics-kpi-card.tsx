"use client";

import Image from "next/image";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type AnalyticsKpiTrendDirection = "up" | "down" | "neutral";
type AnalyticsKpiValueFormat = "number" | "currency" | "text";

type AnalyticsKpiCardProps = {
  title: string;
  value: number | string;
  description?: string;
  icon?: LucideIcon;
  href?: string;

  valueFormat?: AnalyticsKpiValueFormat;
  valuePrefix?: string;
  valueSuffix?: string;

  trendValue?: string | number;
  trendLabel?: string;
  trendDirection?: AnalyticsKpiTrendDirection;

  loading?: boolean;
  className?: string;
};

const SAR_ICON_PATH = "/currency/sar.svg";

function formatEnglishNumber(value: number | string): string {
  if (typeof value === "string") return value;

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatTrendValue(value?: string | number): string | null {
  if (value === undefined || value === null || value === "") return null;

  if (typeof value === "number") {
    const sign = value > 0 ? "+" : value < 0 ? "" : "";
    const formatted = new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 2,
    }).format(value);

    return `${sign}${formatted}%`;
  }

  return value;
}

function getTrendClass(direction: AnalyticsKpiTrendDirection) {
  if (direction === "up") return "text-green-600";
  if (direction === "down") return "text-red-600";
  return "text-muted-foreground";
}

function AnalyticsKpiCardInner({
  title,
  value,
  description,
  icon: Icon,
  valueFormat = "number",
  valuePrefix,
  valueSuffix,
  trendValue,
  trendLabel,
  trendDirection = "neutral",
  loading = false,
  className,
}: AnalyticsKpiCardProps) {
  const formattedValue =
    valueFormat === "text" ? String(value) : formatEnglishNumber(value);

  const formattedTrend = formatTrendValue(trendValue);
  const trendClassName = getTrendClass(trendDirection);

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader>
        <CardDescription>{title}</CardDescription>

        <div className="flex flex-col gap-2">
          {loading ? (
            <div className="h-9 w-28 animate-pulse rounded-xl bg-muted" />
          ) : (
            <h4
              className="font-display flex items-center gap-1.5 text-2xl lg:text-3xl"
              dir="ltr"
            >
              {valuePrefix && <span>{valuePrefix}</span>}

              {valueFormat === "currency" && (
                <Image
                  src={SAR_ICON_PATH}
                  alt="SAR"
                  width={26}
                  height={26}
                  className="inline-block shrink-0"
                />
              )}

              <span>{formattedValue}</span>

              {valueSuffix && (
                <span className="text-sm font-medium text-muted-foreground">
                  {valueSuffix}
                </span>
              )}
            </h4>
          )}

          {(formattedTrend || trendLabel || description) && (
            <div className="text-muted-foreground text-sm">
              {formattedTrend && (
                <span className={cn("font-medium", trendClassName)}>
                  {formattedTrend}
                </span>
              )}

              {(trendLabel || description) && (
                <>
                  {formattedTrend ? " " : ""}
                  <span>{trendLabel || description}</span>
                </>
              )}
            </div>
          )}
        </div>

        {Icon && (
          <CardAction>
            <div className="flex gap-4">
              <div className="bg-muted flex size-12 items-center justify-center rounded-full border">
                <Icon className="size-5" />
              </div>
            </div>
          </CardAction>
        )}
      </CardHeader>
    </Card>
  );
}

export function AnalyticsKpiCard(props: AnalyticsKpiCardProps) {
  if (props.href) {
    return (
      <Link href={props.href} className="block h-full focus:outline-none">
        <AnalyticsKpiCardInner {...props} />
      </Link>
    );
  }

  return <AnalyticsKpiCardInner {...props} />;
}

export type {
  AnalyticsKpiCardProps,
  AnalyticsKpiTrendDirection,
  AnalyticsKpiValueFormat,
};