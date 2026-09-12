import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import CardMenu from "./card-menu";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/* Check-in density per hour (rows) and day (columns), 0 = empty … 4 = busiest */
const heatmap: { hour: string; values: number[] }[] = [
  { hour: "12.00", values: [0, 0, 0, 0, 0, 0] },
  { hour: "11.00", values: [0, 0, 0, 0, 3, 0] },
  { hour: "10.00", values: [1, 1, 3, 1, 3, 1] },
  { hour: "09.00", values: [2, 2, 3, 2, 3, 3] },
  { hour: "08.00", values: [4, 4, 4, 4, 4, 4] }
];

const intensity = [
  "bg-green-500/10",
  "bg-green-500/25",
  "bg-green-500/45",
  "bg-green-500/70",
  "bg-green-600 dark:bg-green-700"
];

export default function AttendanceReport() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance Report</CardTitle>
        <CardAction>
          <CardMenu />
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <div className="font-display text-3xl">78%</div>
          <p className="text-sm">
            <span className="text-muted-foreground">On-time Arrival Rate</span>{" "}
            <span className="font-medium text-green-600">+3.42%</span>
          </p>
        </div>
        <div className="space-y-1.5">
          {heatmap.map((row) => (
            <div key={row.hour} className="flex items-center gap-1.5">
              <span className="text-muted-foreground w-11 shrink-0 text-xs tabular-nums">
                {row.hour}
              </span>
              {row.values.map((value, index) => (
                <span
                  key={index}
                  title={`${days[index]} ${row.hour}`}
                  className={cn("h-11 grow rounded-lg", intensity[value])}
                />
              ))}
            </div>
          ))}
          <div className="flex items-center gap-1.5 pt-1">
            <span className="w-11 shrink-0" />
            {days.map((day) => (
              <span key={day} className="text-muted-foreground grow text-center text-xs">
                {day}
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
