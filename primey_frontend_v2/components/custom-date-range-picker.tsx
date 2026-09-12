"use client";

import * as React from "react";
import {
  endOfDay,
  endOfMonth,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
} from "date-fns";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";

type Locale = "ar" | "en";
type PickerProps = Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> & {
  value?: DateRange;
  onChange?: (value: DateRange | undefined) => void;
  locale?: Locale;
};

const presets = [
  ["today", "اليوم", "Today"],
  ["yesterday", "أمس", "Yesterday"],
  ["thisWeek", "هذا الأسبوع", "This Week"],
  ["last7Days", "آخر 7 أيام", "Last 7 Days"],
  ["last28Days", "آخر 28 يومًا", "Last 28 Days"],
  ["thisMonth", "هذا الشهر", "This Month"],
  ["lastMonth", "الشهر الماضي", "Last Month"],
  ["thisYear", "هذه السنة", "This Year"],
] as const;

export default function CalendarDateRangePicker({ className, value, onChange, locale = "en", ...props }: PickerProps) {
  const isMobile = useIsMobile();
  const today = new Date();
  const twentyEightDaysAgo = startOfDay(subDays(today, 27));
  const [internalDate, setInternalDate] = React.useState<DateRange | undefined>({
    from: twentyEightDaysAgo,
    to: endOfDay(today),
  });
  const date = value ?? internalDate;
  const setDate = React.useCallback(
    (next: DateRange | undefined) => {
      if (value === undefined) setInternalDate(next);
      onChange?.(next);
    },
    [onChange, value],
  );
  const [open, setOpen] = React.useState(false);
  const [currentMonth, setCurrentMonth] = React.useState<Date>(date?.from || new Date());

  const handleQuickSelect = (from: Date, to: Date) => {
    setDate({ from, to });
    setCurrentMonth(from);
  };

  const changeHandle = (type: string) => {
    const now = new Date();
    switch (type) {
      case "today": handleQuickSelect(startOfDay(now), endOfDay(now)); break;
      case "yesterday": { const d = subDays(now, 1); handleQuickSelect(startOfDay(d), endOfDay(d)); break; }
      case "thisWeek": handleQuickSelect(startOfDay(startOfWeek(now)), endOfDay(now)); break;
      case "last7Days": handleQuickSelect(startOfDay(subDays(now, 6)), endOfDay(now)); break;
      case "last28Days": handleQuickSelect(startOfDay(subDays(now, 27)), endOfDay(now)); break;
      case "thisMonth": handleQuickSelect(startOfMonth(now), endOfDay(now)); break;
      case "lastMonth": { const d = subMonths(now, 1); handleQuickSelect(startOfMonth(d), endOfMonth(d)); break; }
      case "thisYear": handleQuickSelect(startOfDay(startOfYear(now)), endOfDay(now)); break;
    }
  };

  const selectDateText = locale === "ar" ? "اختر الفترة" : "Select date range";
  const display = date?.from
    ? date.to
      ? `${format(date.from, "dd MMM yyyy")} - ${format(date.to, "dd MMM yyyy")}`
      : format(date.from, "dd MMM yyyy")
    : selectDateText;

  return (
    <div className={cn("grid gap-2", className)} {...props}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          {isMobile ? (
            <div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button id="date" variant="outline" className={cn("justify-start text-left font-normal", !date && "text-muted-foreground")}>
                      <CalendarIcon />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{display}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          ) : (
            <Button id="date" variant="outline" className={cn("justify-start text-left font-normal", !date && "text-muted-foreground")}>
              <CalendarIcon />{display}
            </Button>
          )}
        </PopoverTrigger>
        <PopoverContent className="w-auto" align="end">
          <div className="flex flex-col lg:flex-row">
            <div className="me-0 lg:me-4">
              <ToggleGroup type="single" defaultValue="last28Days" className="hidden w-28 flex-col lg:block">
                {presets.map(([key, ar, en]) => (
                  <ToggleGroupItem key={key} className="text-muted-foreground w-full" value={key} onClick={() => changeHandle(key)} asChild>
                    <Button className="justify-start rounded-md">{locale === "ar" ? ar : en}</Button>
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <Select defaultValue="last28Days" onValueChange={changeHandle}>
                <SelectTrigger className="mb-4 flex w-full lg:hidden" size="sm" aria-label={selectDateText}>
                  <SelectValue placeholder={locale === "ar" ? "آخر 28 يومًا" : "Last 28 Days"} />
                </SelectTrigger>
                <SelectContent>
                  {presets.map(([key, ar, en]) => <SelectItem key={key} value={key}>{locale === "ar" ? ar : en}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Calendar
              className="border-s-0 py-0! ps-0! pe-0! lg:border-s lg:ps-4!"
              mode="range"
              month={currentMonth}
              selected={date}
              onSelect={(next) => {
                setDate(next);
                if (next?.from) setCurrentMonth(next.from);
              }}
              onMonthChange={setCurrentMonth}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
