"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ranges = ["All", "7d", "1m", "6m", "1y"];

export function TimeRangeTabs({
  value,
  onValueChange
}: {
  value: string;
  onValueChange: (value: string) => void;
}) {
  return (
    <Tabs value={value} onValueChange={onValueChange}>
      <TabsList>
        {ranges.map((range) => (
          <TabsTrigger key={range} value={range}>
            {range}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
