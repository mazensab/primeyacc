import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import CardMenu from "./card-menu";

const departments = [
  { name: "Marketing", value: 456, change: "3.3%", color: "bg-blue-400/60" },
  { name: "Engineering", value: 678, change: "8.1%", color: "bg-amber-400/60" },
  { name: "Finance", value: 300, change: "19.9%", color: "bg-green-400/60" },
  { name: "Design", value: 219, change: "3.3%", color: "bg-violet-400/60" },
  { name: "Sales", value: 783, change: "9.0%", color: "bg-sky-400/60" },
  { name: "Support", value: 654, change: "2.1%", color: "bg-rose-400/60" }
];

const total = departments.reduce((sum, department) => sum + department.value, 0);

export default function DepartmentPerformance() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Work Department Performance</CardTitle>
        <CardAction>
          <CardMenu />
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-6 p-0">
        <div className="p-4 pb-0">
          <div className="flex h-5 gap-1.5">
            {departments.map((department) => (
              <span
                key={department.name}
                className={cn("rounded-md", department.color)}
                style={{ width: `${(department.value / total) * 100}%` }}
              />
            ))}
          </div>
        </div>
        <div className="bg-border grid grid-cols-2 gap-px overflow-hidden rounded-lg sm:grid-cols-3">
          {departments.map((department) => (
            <div key={department.name} className="bg-card space-y-1 p-4">
              <div className="flex items-center gap-2 text-sm">
                <span className={cn("size-2.5 rounded-xs", department.color)} />
                {department.name}
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-display text-2xl">{department.value}</span>
                <span className="text-muted-foreground text-xs">({department.change})</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
