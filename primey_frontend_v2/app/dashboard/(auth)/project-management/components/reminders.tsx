import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowRight, CircleCheck, PlusCircleIcon } from "lucide-react";
import { AddReminderDialog } from "./add-reminder-dialog";

type Reminder = {
  id: number;
  note?: string;
  level?: string;
  type?: string;
  isCompleted: boolean;
  date?: string;
};

const reminders: Reminder[] = [
  {
    id: 1,
    note: "Create a design training for beginners.",
    level: "low",
    type: "Design Education",
    isCompleted: false,
    date: "Today, 12:30"
  },
  {
    id: 2,
    note: "Have a meeting with the new design team.",
    level: "medium",
    type: "Meeting",
    isCompleted: true,
    date: "Today, 10:00"
  },
  {
    id: 3,
    note: "Respond to customer support emails.",
    level: "high",
    type: "Customer Support",
    isCompleted: false,
    date: "Tomorrow, 16:30"
  }
];

export function Reminders() {
  return (
    <Card className="xl:col-span-2">
      <CardHeader>
        <CardTitle>Reminder</CardTitle>
        <CardAction>
          <AddReminderDialog />
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 lg:grid-cols-3">
          {reminders.map((reminder) => (
            <div key={reminder.id} className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center text-sm font-semibold capitalize">
                <span
                  className={cn("me-2 size-2 rounded-full", {
                    "bg-gray-400": reminder.level === "low",
                    "bg-orange-400": reminder.level === "medium",
                    "bg-red-600": reminder.level === "high"
                  })}></span>
                {reminder.level}
                <CircleCheck
                  className={cn(
                    "ms-auto size-4",
                    reminder.isCompleted ? "text-green-600" : "text-gray-400"
                  )}
                />
              </div>
              <div className="text-muted-foreground text-sm">{reminder.date}</div>
              <div className="text-sm">{reminder.note}</div>
              <Badge variant="outline">{reminder.type}</Badge>
            </div>
          ))}
        </div>
        <div className="mt-4 text-end">
          <Button variant="link" className="text-muted-foreground hover:text-primary" asChild>
            <a href="#">
              Show the other 10 reminders <ArrowRight className="size-4" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
