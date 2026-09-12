"use client";

import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function HeaderFilters() {
  const [range, setRange] = useState("24h");
  const [date, setDate] = useState<DateRange | undefined>();
  const [open, setOpen] = useState(false);

  const hasCustomDate = !!date?.from;
  const tooltipLabel = date?.from
    ? date.to
      ? `${format(date.from, "dd MMM yyyy")} - ${format(date.to, "dd MMM yyyy")}`
      : format(date.from, "dd MMM yyyy")
    : "Select custom range";

  return (
    <div className="flex items-center gap-2">
      <Tabs
        value={range}
        onValueChange={(value) => {
          setRange(value);
          setDate(undefined);
        }}>
        <TabsList>
          <TabsTrigger value="24h">Last 24 hours</TabsTrigger>
          <TabsTrigger value="7d">Last 7 days</TabsTrigger>
          <TabsTrigger value="30d">Last 30 days</TabsTrigger>
        </TabsList>
      </Tabs>
      <Popover open={open} onOpenChange={setOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="relative" aria-label={tooltipLabel}>
                <CalendarIcon />
                {hasCustomDate && (
                  <span className="ring-background absolute -top-0.5 -end-0.5 size-2.5 rounded-full bg-green-500 ring-2" />
                )}
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>{tooltipLabel}</TooltipContent>
        </Tooltip>
        <PopoverContent className="w-auto" align="start">
          <Calendar
            mode="range"
            selected={date}
            onSelect={(newDate) => {
              setDate(newDate);
              if (newDate?.from) setRange("");
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
