"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const models = [
  { name: "GPT-4o", usage: 45, benchmark: 75 },
  { name: "Deep research", usage: 37, benchmark: 55 },
  { name: "Claude 3.5", usage: 58, benchmark: 71 }
];

function BulletBar({ usage, benchmark }: { usage: number; benchmark: number }) {
  return (
    <div className="bg-background relative h-2 w-full overflow-hidden rounded-full">
      <div
        className="bg-primary absolute inset-y-0 left-0 rounded-full transition-all duration-500"
        style={{ width: `${usage}%` }}
      />
      <div
        className="bg-muted-foreground absolute inset-y-0 w-0.5 -translate-x-1/2 transition-all duration-500"
        style={{ left: `${benchmark}%` }}
      />
    </div>
  );
}

export function ModelUsageComparisonCard() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Model usage comparison</CardTitle>
      </CardHeader>
      <CardContent className="h-full">
        <div className="grid gap-3 @2xl/card:grid-cols-2">
          {models.map((model) => {
            const delta = model.usage - model.benchmark;

            return (
              <div key={model.name} className="bg-muted space-y-3 rounded-lg p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-medium">{model.name}</p>
                  <span className="bg-background text-muted-foreground shrink-0 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums">
                    {delta > 0 ? `+${delta}` : delta}% vs benchmark
                  </span>
                </div>
                <BulletBar usage={model.usage} benchmark={model.benchmark} />
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <span className="bg-primary size-2 shrink-0 rounded-full" />
                    Sarah
                    <span className="text-foreground font-semibold tabular-nums">
                      {model.usage}%
                    </span>
                  </span>
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <span className="bg-muted-foreground h-3 w-0.5 shrink-0 rounded-full" />
                    Benchmark
                    <span className="text-foreground font-semibold tabular-nums">
                      {model.benchmark}%
                    </span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
