import { GitBranch } from "lucide-react";
import Link from "next/link";

import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const paths = [
  {
    title: "Full-Stack Developer",
    completedModules: 4,
    totalModules: 10,
    indicatorColor: "bg-green-600"
  },
  {
    title: "UX Designer",
    completedModules: 7,
    totalModules: 12,
    indicatorColor: "bg-orange-600"
  }
];

export function LearningPathCard() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Learning Path</CardTitle>
        <CardAction>
          <GitBranch className="text-muted-foreground size-4" />
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        {paths.map((path) => (
          <Link
            key={path.title}
            href="#"
            className="hover:bg-muted block rounded-md border p-4 transition-colors">
            <div className="space-y-2">
              <div className="text-lg font-semibold">{path.title}</div>
              <Progress
                value={(path.completedModules / path.totalModules) * 100}
                indicatorColor={path.indicatorColor}
              />
              <p className="text-muted-foreground text-xs">
                {path.completedModules} of {path.totalModules} modules completed
              </p>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
