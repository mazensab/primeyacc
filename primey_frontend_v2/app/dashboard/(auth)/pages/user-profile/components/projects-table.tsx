import {
  AtomIcon,
  CatIcon,
  ChevronRight,
  Package2Icon,
  PlusIcon,
  ShipWheelIcon,
  TreePalmIcon,
  UnlinkIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

const projects = [
  {
    id: "1",
    name: "UI/UX",
    icon: Package2Icon,
    progress: 0,
    hoursSpent: "4:25",
    updated: "Updated 2 hours ago"
  },
  {
    id: "2",
    name: "Get a complete audit store",
    icon: ShipWheelIcon,
    progress: 45,
    hoursSpent: "18:42",
    updated: "Updated 1 day ago"
  },
  {
    id: "3",
    name: "Build stronger customer relationships",
    icon: TreePalmIcon,
    progress: 59,
    hoursSpent: "9:01",
    updated: "Updated 2 days ago"
  },
  {
    id: "4",
    name: "Update subscription method",
    icon: UnlinkIcon,
    progress: 57,
    hoursSpent: "0:37",
    updated: "Updated 2 days ago"
  },
  {
    id: "5",
    name: "Create a new theme",
    icon: AtomIcon,
    progress: 100,
    hoursSpent: "24:12",
    updated: "Updated 1 week ago"
  },
  {
    id: "6",
    name: "Improve social banners",
    icon: CatIcon,
    progress: 0,
    hoursSpent: "8:08",
    updated: "Updated 1 week ago"
  }
];

export function ProjectsTable() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Projects</CardTitle>
        <CardAction>
          <Button variant="outline" size="sm">
            <PlusIcon /> New Project
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="p-0">
        <Table className="[&_td:first-child]:ps-(--card-spacing) [&_td:last-child]:pe-(--card-spacing) [&_th:first-child]:ps-(--card-spacing) [&_th:last-child]:pe-(--card-spacing)">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Project</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead className="text-right">Hours Spent</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((project) => (
              <TableRow key={project.id}>
                <TableCell className="font-medium">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-lg text-lg">
                      {project.icon && <project.icon className="size-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{project.name}</p>
                      <p className="text-muted-foreground text-xs">{project.updated}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress value={project.progress} />
                    <span className="text-muted-foreground w-8 shrink-0 text-right text-sm">
                      {project.progress}%
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right">{project.hoursSpent}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="border-t py-1.5">
          <Button variant="link" className="text-muted-foreground w-full justify-center">
            View all projects
            <ChevronRight />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
