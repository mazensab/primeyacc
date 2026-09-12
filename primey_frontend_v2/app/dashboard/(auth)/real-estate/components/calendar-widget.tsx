"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface ScheduleItem {
  id: number;
  title: string;
  address: string;
  date: Date;
  type: "all" | "assigned" | "schedule";
}

const scheduleData: ScheduleItem[] = [
  {
    id: 1,
    title: "Visit Client Michael Reynolds",
    address: "742 Oak Street, Denver, CO 80220",
    date: new Date(2025, 5, 2),
    type: "schedule"
  },
  {
    id: 2,
    title: "Visit Client Sarah Thompson",
    address: "1256 Maple Ave, Austin, TX 78704",
    date: new Date(2025, 5, 2),
    type: "schedule"
  },
  {
    id: 3,
    title: "Follow Up Aaliyah Lovato",
    address: "aaliyah123@listify.com | (512) 555-0398",
    date: new Date(2025, 5, 2),
    type: "assigned"
  },
  {
    id: 4,
    title: "Property Inspection - The Orchid",
    address: "450 Park Ave, Ohio, Columbus",
    date: new Date(2025, 5, 8),
    type: "schedule"
  },
  {
    id: 5,
    title: "Contract Review Meeting",
    address: "Online - Zoom Call",
    date: new Date(2025, 5, 8),
    type: "assigned"
  },
  {
    id: 6,
    title: "Open House - Echelon West",
    address: "123 Main St, Ohio, Columbus",
    date: new Date(2025, 5, 9),
    type: "all"
  },
  {
    id: 7,
    title: "Client Callback - John Doe",
    address: "john.doe@email.com | (555) 123-4567",
    date: new Date(2025, 5, 9),
    type: "assigned"
  },
  {
    id: 8,
    title: "Site Visit - La Residence",
    address: "789 Elm Street, Ohio, Columbus",
    date: new Date(2025, 5, 15),
    type: "schedule"
  },
  {
    id: 9,
    title: "Team Meeting",
    address: "Office Conference Room A",
    date: new Date(2025, 5, 20),
    type: "all"
  },
  {
    id: 10,
    title: "Closing Meeting - Maison Sterling",
    address: "Legal Office, New York, Albany",
    date: new Date(2025, 5, 25),
    type: "schedule"
  }
];

export function CalendarWidget() {
  const [date, setDate] = React.useState<Date | undefined>(new Date(2025, 5, 2));
  const [activeTab, setActiveTab] = React.useState<"all" | "assigned" | "schedule">("all");

  const datesWithSchedules = React.useMemo(() => {
    const seen = new Set<string>();
    return scheduleData
      .map((item) => {
        const d = new Date(item.date);
        d.setHours(0, 0, 0, 0);
        return d;
      })
      .filter((d) => {
        const key = d.getTime().toString();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, []);

  const schedulesForSelectedDay = scheduleData.filter((item) => {
    const dateMatch = isSameDay(item.date, date);
    const typeMatch = activeTab === "all" || item.type === activeTab || item.type === "all";
    return dateMatch && typeMatch;
  });

  return (
    <Card>
      <CardContent className="p-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          defaultMonth={new Date(2025, 5, 1)}
          today={new Date(2025, 5, 2)}
          modifiers={{ hasSchedule: datesWithSchedules }}
          modifiersClassNames={{
            hasSchedule:
              "relative after:absolute after:bottom-1 after:left-1/2 after:size-1.5 after:-translate-x-1/2 after:rounded-full after:bg-primary after:content-['']"
          }}
          className="w-full! **:[[role=gridcell]_button]:h-10! **:[[role=gridcell]]:h-10!"
        />

        <div className="border-t p-4 pb-0">
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as "all" | "assigned" | "schedule")}>
            <TabsList className="w-full">
              <TabsTrigger value="all" className="flex-1">
                All
              </TabsTrigger>
              <TabsTrigger value="assigned" className="flex-1">
                Assigned
              </TabsTrigger>
              <TabsTrigger value="schedule" className="flex-1">
                My Schedule
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="max-h-56 divide-y overflow-y-auto">
          {schedulesForSelectedDay.map((item) => (
            <div className="w-full p-4" key={item.id}>
              <div className="flex items-start gap-3">
                <div className="space-y-1">
                  <p className="leading-none font-medium">{item.title}</p>
                  <p className="text-muted-foreground text-xs">{item.address}</p>
                  <p className="text-muted-foreground text-xs">
                    {format(item.date, "MMM d, yyyy")}
                  </p>
                </div>
                <Badge
                  variant={item.type === "assigned" ? "warning" : "secondary"}
                  className="ms-auto capitalize">
                  {item.type === "schedule" ? "my schedule" : item.type}
                </Badge>
              </div>
            </div>
          ))}
          {schedulesForSelectedDay.length === 0 && (
            <div className="text-muted-foreground px-4 py-8 text-center text-sm">
              No tasks scheduled for {date ? format(date, "MMMM d, yyyy") : "this day"}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function isSameDay(a: Date, b: Date | undefined): boolean {
  if (!b) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
