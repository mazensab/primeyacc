import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const milestones = [
  {
    title: "Kickoff and keyword research",
    description: "Project setup, keyword universe mapped, priority list agreed with Acme Cloud.",
    date: "Jan 8, 2026",
    status: "Completed",
    statusVariant: "success" as const,
    dotClass: "bg-green-500"
  },
  {
    title: "First 8 articles published",
    description: "Initial batch live, internal linking started, rank tracking in place.",
    date: "Jan 26, 2026",
    status: "Completed",
    statusVariant: "success" as const,
    dotClass: "bg-green-500"
  },
  {
    title: "Mid-project review with Acme Cloud",
    description: "Traffic checkpoint, keyword ranking review, and scope adjustments if needed.",
    date: "Feb 6, 2026",
    status: "In progress",
    statusVariant: "info" as const,
    dotClass: "bg-primary"
  },
  {
    title: "All 24 articles published",
    description: "Full content engine live with all internal-link clusters mapped.",
    date: "Feb 21, 2026",
    status: "Upcoming",
    statusVariant: "outline" as const,
    dotClass: "bg-muted-foreground/30"
  },
  {
    title: "Final report and handoff",
    description: "Performance report, learnings, and a playbook for the in-house team.",
    date: "Feb 28, 2026",
    status: "Upcoming",
    statusVariant: "outline" as const,
    dotClass: "bg-muted-foreground/30"
  }
];

export function TimelineTab() {
  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-8 before:absolute before:top-2 before:bottom-2 before:left-[5px] before:w-px before:bg-border">
          {milestones.map((milestone) => (
            <div key={milestone.title} className="relative flex gap-4 ps-8">
              <span
                className={cn(
                  "ring-background absolute top-1.5 left-0 size-[11px] rounded-full ring-4",
                  milestone.dotClass
                )}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{milestone.title}</span>
                  <Badge variant={milestone.statusVariant}>{milestone.status}</Badge>
                </div>
                <p className="text-muted-foreground mt-1 text-sm">{milestone.description}</p>
                <p className="text-muted-foreground mt-1 text-xs">{milestone.date}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
