import { PlusIcon } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

const tasks = [
  {
    title: 'Publish "10 Best Practices for HR Onboarding" article',
    type: "Article",
    status: "In review",
    statusVariant: "warning" as const,
    assignee: { name: "Priya Patel", avatar: "https://i.pravatar.cc/150?img=15" },
    due: "Feb 5, 2026"
  },
  {
    title: 'Draft outline for "Onboarding Automation Guide"',
    type: "Outline",
    status: "In progress",
    statusVariant: "info" as const,
    assignee: { name: "Andika", avatar: "https://i.pravatar.cc/150?img=12" },
    due: "Feb 8, 2026"
  },
  {
    title: 'Refresh SEO for "Employee Retention Metrics" post',
    type: "SEO refresh",
    status: "In progress",
    statusVariant: "info" as const,
    assignee: { name: "Priya Patel", avatar: "https://i.pravatar.cc/150?img=15" },
    due: "Feb 10, 2026"
  },
  {
    title: "Map internal links for the payroll cluster",
    type: "Cluster",
    status: "To do",
    statusVariant: "outline" as const,
    assignee: { name: "Andika", avatar: "https://i.pravatar.cc/150?img=12" },
    due: "Feb 12, 2026"
  },
  {
    title: "Keyword research for the Q2 pipeline",
    type: "Research",
    status: "To do",
    statusVariant: "outline" as const,
    assignee: { name: "Marcus Rivera", avatar: "https://i.pravatar.cc/150?img=8" },
    due: "Feb 14, 2026"
  },
  {
    title: 'Publish "Payroll Compliance Checklist" article',
    type: "Article",
    status: "Done",
    statusVariant: "success" as const,
    assignee: { name: "Priya Patel", avatar: "https://i.pravatar.cc/150?img=15" },
    due: "Jan 30, 2026"
  },
  {
    title: "Set up rank tracking for priority keywords",
    type: "SEO setup",
    status: "Done",
    statusVariant: "success" as const,
    assignee: { name: "Andika", avatar: "https://i.pravatar.cc/150?img=12" },
    due: "Jan 15, 2026"
  },
  {
    title: "Competitor content gap analysis",
    type: "Research",
    status: "Done",
    statusVariant: "success" as const,
    assignee: { name: "Marcus Rivera", avatar: "https://i.pravatar.cc/150?img=8" },
    due: "Jan 12, 2026"
  }
];

export function TasksTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-baseline gap-2">
          Tasks
          <span className="text-muted-foreground text-xs font-normal">24 total · 16 done</span>
        </CardTitle>
        <CardAction>
          <Button size="sm">
            <PlusIcon /> New Task
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col p-0 [&_[data-slot=table-container]]:flex-1">
        <Table className="min-w-[640px] table-fixed [&_td:first-child]:ps-(--card-spacing) [&_td:last-child]:pe-(--card-spacing) [&_th:first-child]:ps-(--card-spacing) [&_th:last-child]:pe-(--card-spacing)">
          <TableHeader>
            <TableRow>
              <TableHead>Task</TableHead>
              <TableHead className="w-32">Status</TableHead>
              <TableHead className="w-44">Assignee</TableHead>
              <TableHead className="w-28 text-end">Due Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => (
              <TableRow key={task.title}>
                <TableCell>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{task.title}</div>
                    <div className="text-muted-foreground text-xs">{task.type}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={task.statusVariant}>{task.status}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="size-6">
                      <AvatarImage src={task.assignee.avatar} alt={task.assignee.name} />
                      <AvatarFallback>{task.assignee.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm whitespace-nowrap">{task.assignee.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-end text-sm whitespace-nowrap">
                  {task.due}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
