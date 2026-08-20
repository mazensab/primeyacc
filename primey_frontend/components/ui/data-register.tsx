"use client";

import * as React from "react";
import { CalendarDays, RotateCcw, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export const registerOutlineButtonClass =
  "h-9 bg-background px-3 shadow-none [&_svg]:text-primary";

export const registerBrandButtonClass =
  "h-9 px-3";

type DataRegisterToolbarProps =
  React.ComponentProps<"div">;

export function DataRegisterToolbar({
  className,
  ...props
}: DataRegisterToolbarProps) {
  return (
    <div
      data-slot="data-register-toolbar"
      className={cn(
        "rounded-lg border bg-muted/20 p-3",
        className,
      )}
      {...props}
    />
  );
}

type DataRegisterSearchProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
};

export function DataRegisterSearch({
  value,
  onChange,
  placeholder,
  className,
  inputClassName,
  disabled = false,
}: DataRegisterSearchProps) {
  return (
    <div
      data-slot="data-register-search"
      className={cn("relative", className)}
    >
      <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
      <Input
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "h-9 bg-background ps-9 shadow-none",
          inputClassName,
        )}
      />
    </div>
  );
}

function parseIsoDate(value: string) {
  if (!value) return undefined;

  const [year, month, day] = value
    .slice(0, 10)
    .split("-")
    .map(Number);

  if (!year || !month || !day) {
    return undefined;
  }

  const parsed = new Date(
    year,
    month - 1,
    day,
  );

  return Number.isNaN(parsed.getTime())
    ? undefined
    : parsed;
}

function dateToIso(value?: Date) {
  if (!value) return "";

  const year = value.getFullYear();
  const month = String(
    value.getMonth() + 1,
  ).padStart(2, "0");
  const day = String(
    value.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

type DataRegisterDatePickerProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  locale: "ar" | "en";
  className?: string;
  disabled?: boolean;
};

export function DataRegisterDatePicker({
  label,
  value,
  onChange,
  locale,
  className,
  disabled = false,
}: DataRegisterDatePickerProps) {
  const [open, setOpen] =
    React.useState(false);

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-label={label}
          title={label}
          disabled={disabled}
          className={cn(
            "h-9 w-full justify-start bg-background px-3 text-start font-normal shadow-none sm:w-[168px]",
            className,
          )}
        >
          <CalendarDays className="me-2 h-4 w-4 shrink-0 text-primary" />
          <span
            dir="ltr"
            lang="en"
            className="truncate tabular-nums"
          >
            {value || label}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0"
        align={
          locale === "ar"
            ? "end"
            : "start"
        }
      >
        <Calendar
          mode="single"
          selected={parseIsoDate(value)}
          onSelect={(
            date: Date | undefined,
          ) => {
            onChange(dateToIso(date));
            setOpen(false);
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

type DataRegisterEmptyStateProps = {
  title: string;
  description: string;
  showReset?: boolean;
  onReset?: () => void;
  resetLabel?: string;
  action?: React.ReactNode;
  icon?: React.ComponentType<{
    className?: string;
  }>;
  className?: string;
};

export function DataRegisterEmptyState({
  title,
  description,
  showReset = false,
  onReset,
  resetLabel = "Reset",
  action,
  icon: Icon = Search,
  className,
}: DataRegisterEmptyStateProps) {
  return (
    <div
      data-slot="data-register-empty-state"
      className={cn(
        "flex h-full min-h-64 flex-col items-center justify-center gap-3 px-6 py-10 text-center",
        className,
      )}
    >
      <span className="flex size-11 items-center justify-center rounded-full border border-border bg-muted/40 text-primary shadow-sm dark:bg-white/[0.05]">
        <Icon className="h-5 w-5" />
      </span>

      <div>
        <h3 className="text-sm font-semibold text-foreground">
          {title}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {description}
        </p>
      </div>

      {showReset || action ? (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {showReset && onReset ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={registerOutlineButtonClass}
              onClick={onReset}
            >
              <RotateCcw className="h-4 w-4" />
              {resetLabel}
            </Button>
          ) : null}

          {action}
        </div>
      ) : null}
    </div>
  );
}
