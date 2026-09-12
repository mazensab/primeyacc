"use client";

import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Phone } from "lucide-react";

interface Lead {
  id: number;
  name: string;
  location: string;
  avatar: string;
}

interface LeadsContactProps {
  items: Lead[];
}

export function LeadsContact({ items }: LeadsContactProps) {
  return (
    <Card className="gap-2">
      <CardHeader>
        <CardTitle>Leads Contact</CardTitle>
        <CardAction>
          <Button variant="ghost" size="icon-sm" className="rounded-full">
            <ArrowUpRight />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-1">
        {items.map((lead) => (
          <div
            key={lead.id}
            className="hover:bg-muted flex items-center justify-between rounded-lg p-2">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar>
                <AvatarImage src={lead.avatar} />
                <AvatarFallback>{lead.name[0]}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 space-y-1">
                <p className="font-medium">{lead.name}</p>
                <p className="text-muted-foreground truncate text-xs">{lead.location}</p>
              </div>
            </div>
            <Button variant="outline" size="icon-xs" className="rounded-full">
              <Phone />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
