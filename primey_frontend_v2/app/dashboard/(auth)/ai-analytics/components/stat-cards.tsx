"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Stat = {
  name: string;
  description: string;
  value: string;
  target?: string;
  ratio: number;
  color: string;
};

const data: Stat[] = [
  {
    name: "Volume",
    description: "Total Tokens Generated",
    value: "2,450,230",
    target: "5,000,000",
    ratio: 2450230 / 5000000,
    color: "bg-green-500"
  },
  {
    name: "Activity",
    description: "Total Interactions",
    value: "14,302",
    target: "18,000",
    ratio: 14302 / 18000,
    color: "bg-amber-500"
  },
  {
    name: "Cost",
    description: "Estimated Cost",
    value: "$245.80",
    ratio: 0.28,
    color: "bg-green-500"
  },
  {
    name: "Efficiency",
    description: "Cache Hit Rate",
    value: "68.4%",
    target: "80% goal",
    ratio: 0.684,
    color: "bg-blue-500"
  }
];

const SEGMENT_COUNT = 32;

function TickProgress({ ratio, color, label }: { ratio: number; color: string; label: string }) {
  const filled = Math.round(ratio * SEGMENT_COUNT);

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(ratio * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className="flex items-center gap-1">
      {Array.from({ length: SEGMENT_COUNT }).map((_, index) => (
        <span key={index} className="bg-muted-foreground/20 relative h-5 w-1 flex-1 rounded-full">
          {index < filled && (
            <span
              className={cn(
                color,
                "animate-in fade-in fill-mode-backwards absolute inset-0 rounded-full duration-300 motion-reduce:animate-none"
              )}
              style={{ animationDelay: `${index * 35}ms` }}
            />
          )}
        </span>
      ))}
    </div>
  );
}

export function StatCards() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-6 xl:grid-cols-4">
      {data.map((item) => (
        <Card key={item.name}>
          <CardHeader>
            <CardTitle>{item.name}</CardTitle>
            <CardDescription>{item.description}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col justify-end gap-3">
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-2xl lg:text-3xl">{item.value}</span>
              {item.target && (
                <span className="text-muted-foreground text-sm">of {item.target}</span>
              )}
            </div>
            <TickProgress ratio={item.ratio} color={item.color} label={`${item.name} progress`} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
