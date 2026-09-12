import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const closedDeals = 42;
const dealsInProgress = 132;
const closedPercent = Math.round((closedDeals / (closedDeals + dealsInProgress)) * 100);

export function DealsProgress() {
  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex justify-between">
          <div className="flex items-end gap-1.5">
            <p className="text-2xl font-bold">{closedDeals}</p>
            <p className="text-muted-foreground mb-0.5 text-sm">Closed Deals</p>
          </div>
          <div className="flex items-end gap-1.5">
            <p className="text-muted-foreground mb-0.5 text-sm">On Progress</p>
            <p className="text-2xl font-bold">{dealsInProgress}</p>
          </div>
        </div>
        <div className="relative">
          <Progress
            value={closedPercent}
            aria-label={`${closedPercent}% of deals closed`}
            className="bg-muted h-8 w-full rounded-full **:data-[slot='progress-indicator']:rounded-full"
          />
          <span className="text-primary-foreground absolute inset-0 flex items-center ps-4 text-xs">
            Deals · {closedPercent}%
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
