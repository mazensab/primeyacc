import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const rankStyles: Record<number, string> = {
  1: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  2: "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  3: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400"
};

export function LeaderboardCard() {
  const topStudents = [
    {
      id: 1,
      name: "Liam Smith",
      points: 5000,
      avatar: `https://i.pravatar.cc/150?img=8`
    },
    {
      id: 2,
      name: "Emma Brown",
      points: 4800,
      avatar: `https://i.pravatar.cc/150?img=16`
    },
    {
      id: 3,
      name: "Noah Johnson",
      points: 4600,
      avatar: `https://i.pravatar.cc/150?img=3`
    },
    {
      id: 4,
      name: "Olivia Davis",
      points: 4400,
      avatar: `https://i.pravatar.cc/150?img=26`
    },
    {
      id: 5,
      name: "Sophia Miller",
      points: 4150,
      avatar: `https://i.pravatar.cc/150?img=31`
    }
  ];

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Leaderboard</CardTitle>
        <CardAction>
          <Button variant="outline" size="icon-sm" aria-label="View full leaderboard">
            <ChevronRight />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {topStudents.map((student, index) => {
            const rank = index + 1;
            return (
              <li key={student.id} className="flex items-center gap-3">
                <span
                  className={cn(
                    "bg-muted text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
                    rankStyles[rank]
                  )}>
                  {rank}
                </span>
                <Avatar>
                  <AvatarImage src={student.avatar} alt={student.name} />
                  <AvatarFallback>
                    {student.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <span className="flex-1 truncate font-medium">{student.name}</span>
                <Badge variant="outline" className="tabular-nums">
                  {student.points.toLocaleString("en-US")} pts
                </Badge>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
