"use client";

import { useState } from "react";
import {
  CalendarDaysIcon,
  CalendarOffIcon,
  ChevronRightIcon,
  ClipboardCheckIcon,
  CoffeeIcon,
  MonitorPlayIcon,
  PhoneCallIcon,
  PresentationIcon,
  UsersIcon,
  VideoIcon
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia } from "@/components/ui/empty";
import { cn } from "@/lib/utils";

const week = [
  { day: 1, label: "Mo" },
  { day: 2, label: "Tu" },
  { day: 3, label: "We" },
  { day: 4, label: "Th" },
  { day: 5, label: "Fr" },
  { day: 6, label: "Sa" },
  { day: 7, label: "Su" }
];

const meetingTypes = {
  video: { icon: VideoIcon, className: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  webinar: {
    icon: MonitorPlayIcon,
    className: "bg-green-500/10 text-green-600 dark:text-green-400"
  },
  call: { icon: PhoneCallIcon, className: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  room: {
    icon: PresentationIcon,
    className: "bg-purple-500/10 text-purple-600 dark:text-purple-400"
  },
  sync: { icon: UsersIcon, className: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
  review: {
    icon: ClipboardCheckIcon,
    className: "bg-purple-500/10 text-purple-600 dark:text-purple-400"
  },
  casual: { icon: CoffeeIcon, className: "bg-orange-500/10 text-orange-600 dark:text-orange-400" }
} as const;

type Meeting = {
  title: string;
  place: string;
  time: string;
  type: keyof typeof meetingTypes;
};

const schedule: Record<number, Meeting[]> = {
  1: [
    { title: "Weekly Kick-Off", place: "Online", time: "09:00 AM", type: "video" },
    { title: "Recruitment Sync", place: "Meeting Room B", time: "02:00 PM", type: "sync" }
  ],
  2: [
    { title: "Onboarding: New Hires", place: "Online", time: "10:00 AM", type: "webinar" },
    { title: "Payroll Review Call", place: "Online", time: "03:30 PM", type: "call" }
  ],
  3: [
    { title: "Employee Safety Workshop", place: "Online", time: "01:30 PM", type: "video" },
    { title: "Team Huddle", place: "Online", time: "08:30 AM", type: "webinar" },
    { title: "Business Presentation", place: "Conference Room", time: "11:00 AM", type: "room" }
  ],
  4: [
    { title: "Performance Reviews", place: "Meeting Room A", time: "09:30 AM", type: "review" },
    { title: "1:1 with Design Lead", place: "Online", time: "04:00 PM", type: "video" }
  ],
  5: [
    { title: "All-Hands Meeting", place: "Main Hall", time: "10:00 AM", type: "room" },
    { title: "Friday Social", place: "Lounge", time: "05:00 PM", type: "casual" }
  ],
  6: [{ title: "Wellness Program", place: "Online", time: "11:00 AM", type: "webinar" }],
  7: []
};

export default function WorkCalendar() {
  const [activeDay, setActiveDay] = useState(3);
  const meetings = schedule[activeDay] ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg border">
            <CalendarDaysIcon className="size-4" />
          </span>
          Work Calendar
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid grid-cols-7 gap-1.5">
          {week.map((item) => {
            const isActive = item.day === activeDay;
            return (
              <button
                key={item.day}
                type="button"
                onClick={() => setActiveDay(item.day)}
                aria-pressed={isActive}
                className="group flex cursor-pointer flex-col items-center gap-2"
              >
                <span
                  className={cn(
                    "flex h-11 w-full items-center justify-center rounded-lg text-sm transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary font-semibold"
                      : "bg-muted/60 text-muted-foreground group-hover:bg-muted"
                  )}
                >
                  {item.day}
                </span>
                <span
                  className={cn(
                    "border-b-2 pb-1 text-sm transition-colors",
                    isActive
                      ? "border-primary text-primary font-semibold"
                      : "text-muted-foreground border-transparent"
                  )}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
        <div className="space-y-3">
          {meetings.length > 0 ? (
            meetings.map((meeting) => {
              const type = meetingTypes[meeting.type];
              return (
                <button
                  key={meeting.title}
                  type="button"
                  className="group hover:bg-muted/50 flex w-full cursor-pointer items-center gap-3 rounded-xl border p-3 text-start transition-colors"
                >
                  <div
                    className={cn(
                      "flex size-11 shrink-0 items-center justify-center rounded-lg",
                      type.className
                    )}
                  >
                    <type.icon className="size-5" />
                  </div>
                  <div className="min-w-0 grow">
                    <p className="truncate text-sm font-semibold">{meeting.title}</p>
                    <p className="text-muted-foreground mt-0.5 text-sm">
                      {meeting.place}
                      <span className="mx-1.5 inline-block size-1 rounded-full bg-current align-middle opacity-40" />
                      {meeting.time}
                    </p>
                  </div>
                  <ChevronRightIcon className="text-muted-foreground size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
                </button>
              );
            })
          ) : (
            <Empty className="rounded-xl border border-dashed py-8">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CalendarOffIcon />
                </EmptyMedia>
                <EmptyDescription>No meetings scheduled for this day.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
