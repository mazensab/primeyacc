import { ArrowDownIcon, ArrowUpIcon, CheckCircle, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface StudentSuccessCardProps {
  currentSuccessRate: number;
  previousSuccessRate: number;
  totalStudents: number;
  passingStudents: number;
}

export function StudentSuccessCard({
  currentSuccessRate = 86,
  previousSuccessRate = 82,
  totalStudents = 1250,
  passingStudents = 1075
}: StudentSuccessCardProps) {
  const successRateChange = currentSuccessRate - previousSuccessRate;
  const isPositiveChange = successRateChange >= 0;
  const passingPercentage = (passingStudents / totalStudents) * 100;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Student Overall Success Rate</CardTitle>
      </CardHeader>
      <CardContent className="flex h-full flex-col gap-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="font-display text-4xl">{currentSuccessRate}%</span>
            <Badge variant={isPositiveChange ? "success" : "destructive"}>
              {isPositiveChange ? <ArrowUpIcon /> : <ArrowDownIcon />}
              {Math.abs(successRateChange)}%
            </Badge>
          </div>
          <div className="mt-4 space-y-1.5">
            <Progress className="h-1.5" value={currentSuccessRate} />
            <div className="text-muted-foreground flex justify-between text-xs">
              <span>Previous: {previousSuccessRate}%</span>
              <span>
                {isPositiveChange ? "+" : "-"}
                {Math.abs(successRateChange)}% this term
              </span>
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Users className="size-4" />
            </div>
            <span className="flex-1 text-sm font-medium">Total Students</span>
            <span className="font-semibold tabular-nums">
              {totalStudents.toLocaleString("en-US")}
            </span>
          </div>
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
              <CheckCircle className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">Passing Students</div>
              <div className="text-muted-foreground text-xs">
                {passingPercentage.toFixed(1)}% of total
              </div>
            </div>
            <span className="font-semibold tabular-nums">
              {passingStudents.toLocaleString("en-US")}
            </span>
          </div>
        </div>
        <Button variant="outline" className="mt-auto w-full">
          View Details
        </Button>
      </CardContent>
    </Card>
  );
}
