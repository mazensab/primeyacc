"use client";

import type { ReactNode } from "react";
import { CalendarDays, Download, Loader2, RefreshCcw, Search } from "lucide-react";

import CustomDateRangePicker from "@/components/custom-date-range-picker";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AnalyticsToolbarAction = {
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  variant?: "default" | "outline" | "secondary" | "ghost";
};

type AnalyticsToolbarProps = {
  title: string;
  description?: string;

  searchValue?: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;

  periodLabel?: string;
  refreshLabel?: string;
  exportLabel?: string;

  loading?: boolean;
  hideDateRange?: boolean;
  hideSearch?: boolean;
  hideRefresh?: boolean;
  hideExport?: boolean;

  onRefreshClick?: () => void;
  onExportClick?: () => void;

  actions?: AnalyticsToolbarAction[];
  className?: string;
};

export function AnalyticsToolbar({
  title,
  description,
  searchValue = "",
  searchPlaceholder = "Search...",
  onSearchChange,
  periodLabel,
  refreshLabel = "Refresh",
  exportLabel = "Download",
  loading = false,
  hideDateRange = false,
  hideSearch = false,
  hideRefresh = false,
  hideExport = false,
  onRefreshClick,
  onExportClick,
  actions = [],
  className,
}: AnalyticsToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between",
        className,
      )}
      dir="ltr"
    >
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight lg:text-2xl">
          {title}
        </h1>

        {description && (
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {!hideSearch && onSearchChange && (
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

            <input
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={searchPlaceholder}
              className={cn(
                "h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none transition-colors",
                "placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/15 sm:w-72",
              )}
            />
          </div>
        )}

        {!hideDateRange && (
          <div className="shrink-0">
            {periodLabel ? (
              <Button type="button" variant="outline" className="h-10 rounded-md">
                <CalendarDays className="size-4" />
                <span>{periodLabel}</span>
              </Button>
            ) : (
              <CustomDateRangePicker />
            )}
          </div>
        )}

        {!hideRefresh && (
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-md"
            disabled={loading}
            onClick={onRefreshClick}
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCcw className="size-4" />
            )}
            <span>{refreshLabel}</span>
          </Button>
        )}

        {!hideExport && (
          <Button
            type="button"
            className="h-10 rounded-md"
            onClick={onExportClick}
          >
            <Download className="size-4" />
            <span>{exportLabel}</span>
          </Button>
        )}

        {actions.map((action) => (
          <Button
            key={action.label}
            type="button"
            variant={action.variant || "outline"}
            className="h-10 rounded-md"
            disabled={action.disabled}
            onClick={action.onClick}
          >
            {action.icon}
            <span>{action.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}

export type { AnalyticsToolbarAction, AnalyticsToolbarProps };