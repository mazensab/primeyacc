import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export default function SavingGoal() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Saving Goal
          <Badge variant="secondary">75% Progress</Badge>
        </CardTitle>
        <CardAction>
          <Button variant="outline" size="sm">
            View Report
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="font-display text-4xl">
            $1052.98
            <span className="text-muted-foreground ml-2 text-sm font-normal">of $1,200</span>
          </div>
          <Progress
            value={75}
            className="h-3"
            indicatorColor="bg-linear-to-r from-chart-1 to-chart-3"
          />
        </div>
      </CardContent>
    </Card>
  );
}
