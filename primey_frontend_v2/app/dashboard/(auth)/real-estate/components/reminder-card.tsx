"use client";

import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarGroup, AvatarImage } from "@/components/ui/avatar";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

interface ReminderItem {
  title: string;
  description: string;
  month?: string;
  day?: string;
  avatars?: string[];
}

interface ReminderCardProps {
  items: ReminderItem[];
}

export function ReminderCard({ items }: ReminderCardProps) {
  const reminderItems = items.slice(0, 3);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reminder</CardTitle>
        <CardAction>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Reminder options">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>View all reminders</DropdownMenuItem>
              <DropdownMenuItem>Add reminder</DropdownMenuItem>
              <DropdownMenuItem>Mark all as done</DropdownMenuItem>
              <DropdownMenuItem>Notification settings</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {reminderItems.map((item, index) => (
          <div
            key={index}
            className="bg-muted/50 flex flex-1 items-center gap-3 rounded-lg border p-3">
            <div className="bg-background min-w-18 rounded-lg border px-3 py-2 text-center">
              <p className="text-muted-foreground text-xs leading-none">{item.month ?? "Oct"}</p>
              <p className="mt-1 text-xl leading-none font-semibold">{item.day ?? "01"}</p>
            </div>

            <div className="min-w-0 flex-1 space-y-1">
              <p className="truncate leading-tight font-semibold">{item.title}</p>
              <p className="text-muted-foreground truncate text-sm">{item.description}</p>
            </div>

            {item.avatars?.length ? (
              <AvatarGroup>
                {item.avatars.slice(0, 2).map((avatar, i) => (
                  <Avatar key={i}>
                    <AvatarImage src={avatar} />
                    <AvatarFallback>U</AvatarFallback>
                  </Avatar>
                ))}
                {item.avatars.length > 2 && (
                  <div className="bg-background text-muted-foreground border-background flex size-8 items-center justify-center rounded-full border-2 text-xs font-medium">
                    +{item.avatars.length - 2}
                  </div>
                )}
              </AvatarGroup>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
