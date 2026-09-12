import {
  CheckCircle2Icon,
  CircleIcon,
  InfoIcon,
  PlusIcon,
  TrendingUpIcon
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const goals = [
  { title: "24 long-form articles by end of Q1", status: "16 / 24 published", done: true },
  { title: "Top-3 ranking for 8 priority keywords", status: "5 / 8 achieved", done: true },
  { title: "4x organic traffic by April 1", status: "currently at 2.3x", done: false },
  { title: "Build 12 internal-link clusters", status: "7 / 12 mapped", done: false }
];

const recentTasks = [
  {
    title: 'Publish "10 Best Practices for HR Onboarding" article',
    meta: "Article · Due tomorrow",
    status: "In review",
    statusVariant: "warning" as const,
    avatar: "https://i.pravatar.cc/150?img=12"
  },
  {
    title: 'Draft outline for "Onboarding Automation Guide"',
    meta: "Outline · Due Feb 8",
    status: "In progress",
    statusVariant: "info" as const,
    avatar: "https://i.pravatar.cc/150?img=5"
  },
  {
    title: 'Refresh SEO for "Employee Retention Metrics" post',
    meta: "SEO refresh · Due Feb 10",
    status: "In progress",
    statusVariant: "info" as const,
    avatar: "https://i.pravatar.cc/150?img=8"
  },
  {
    title: "Map internal links for the payroll cluster",
    meta: "Cluster · Due Feb 12",
    status: "To do",
    statusVariant: "outline" as const,
    avatar: "https://i.pravatar.cc/150?img=15"
  },
  {
    title: "Keyword research for the Q2 pipeline",
    meta: "Research · Due Feb 14",
    status: "To do",
    statusVariant: "outline" as const,
    avatar: "https://i.pravatar.cc/150?img=3"
  }
];

const team = [
  {
    name: "Andika",
    role: "Project Lead",
    allocation: "100%",
    avatar: "https://i.pravatar.cc/150?img=12"
  },
  {
    name: "Sarah Chen",
    role: "CEO · Primary contact",
    allocation: "100%",
    avatar: "https://i.pravatar.cc/150?img=5"
  },
  {
    name: "Marcus Rivera",
    role: "CMO · Marketing lead",
    allocation: "100%",
    avatar: "https://i.pravatar.cc/150?img=8"
  },
  {
    name: "Priya Patel",
    role: "Content Director",
    allocation: "100%",
    avatar: "https://i.pravatar.cc/150?img=15"
  }
];

const projectInfo = [
  { label: "Industry", value: "SaaS · HR-tech" },
  { label: "Started", value: "Jan 8, 2026" },
  { label: "Deadline", value: "Feb 28, 2026" },
  { label: "Budget", value: "$24,000" },
  { label: "Type", value: "Content engine" }
];

export function OverviewTab() {
  return (
    <div className="grid items-start gap-4 lg:grid-cols-3 lg:gap-6">
      <div className="space-y-4 lg:col-span-2 lg:space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              About this project
              <Tooltip>
                <TooltipTrigger asChild>
                  <InfoIcon className="text-muted-foreground size-3.5" />
                </TooltipTrigger>
                <TooltipContent>Goal, scope, and current bets</TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Acme Cloud is a SaaS HR-tech platform. They wanted to 4x organic traffic to their
              blog within 6 months by attacking high-intent commercial keywords their competitors
              were ignoring. We are running a 24-article content engine plus targeted SEO refreshes
              on existing top performers.
            </p>
            <div className="mt-2 divide-y">
              {goals.map((goal) => (
                <div key={goal.title} className="flex items-center gap-3 py-3 last:pb-0">
                  {goal.done ? (
                    <CheckCircle2Icon className="size-4.5 shrink-0 text-green-600" />
                  ) : (
                    <CircleIcon className="text-muted-foreground/40 size-4.5 shrink-0" />
                  )}
                  <span className="text-sm font-medium">{goal.title}</span>
                  <span className="text-muted-foreground ms-auto shrink-0 text-sm">
                    {goal.status}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
              <div>
                <div className="font-display text-2xl lg:text-3xl">
                  24<span className="text-muted-foreground text-base font-normal">/35</span>
                </div>
                <p className="text-muted-foreground text-sm">Tasks · 16 done</p>
              </div>
              <div>
                <div className="font-display text-2xl lg:text-3xl">
                  23<span className="text-muted-foreground text-base font-normal">d</span>
                </div>
                <p className="text-muted-foreground text-sm">Until Feb 28</p>
              </div>
              <div>
                <div className="font-display text-2xl lg:text-3xl">
                  $11k<span className="text-muted-foreground text-base font-normal">/24k</span>
                </div>
                <p className="text-muted-foreground text-sm">Budget · 45% used</p>
              </div>
              <div>
                <div className="font-display flex items-center gap-1.5 text-2xl lg:text-3xl">
                  2.3x <TrendingUpIcon className="size-5 text-green-600" />
                </div>
                <p className="text-muted-foreground text-sm">Traffic vs baseline</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-baseline gap-2">
              Recent Tasks
              <span className="text-muted-foreground text-xs font-normal">
                5 of 24 · 8 due this week
              </span>
            </CardTitle>
            <CardAction className="flex items-center gap-2 @max-md/card:w-full">
              <Button variant="outline" size="sm">
                View all
              </Button>
              <Button size="sm">
                <PlusIcon /> New
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {recentTasks.map((task) => (
                <div key={task.title} className="flex items-center gap-3 px-(--card-spacing) py-3">
                  <Checkbox aria-label={`Mark ${task.title} as done`} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{task.title}</div>
                    <div className="text-muted-foreground text-xs">{task.meta}</div>
                  </div>
                  <Badge variant={task.statusVariant} className="ms-auto shrink-0">
                    {task.status}
                  </Badge>
                  <Avatar className="size-7 shrink-0">
                    <AvatarImage src={task.avatar} alt="Assignee" />
                    <AvatarFallback>CN</AvatarFallback>
                  </Avatar>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4 lg:space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-baseline gap-2">
              Team
              <span className="text-muted-foreground text-xs font-normal">4 members</span>
            </CardTitle>
            <CardAction>
              <Button variant="outline" size="sm">
                <PlusIcon /> Add
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {team.map((member) => (
                <div key={member.name} className="flex items-center gap-3 px-(--card-spacing) py-3">
                  <Avatar className="size-9">
                    <AvatarImage src={member.avatar} alt={member.name} />
                    <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{member.name}</div>
                    <div className="text-muted-foreground truncate text-xs">{member.role}</div>
                  </div>
                  <span className="text-muted-foreground ms-auto text-sm">{member.allocation}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Project Info</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <div className="divide-y">
              <div className="flex items-center justify-between px-4 py-3 pt-0 text-sm">
                <span className="text-muted-foreground">Client</span>
                <Badge variant="secondary">Acme Cloud</Badge>
              </div>
              {projectInfo.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between py-3 px-4 text-sm last:pb-0">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="font-medium">{row.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
