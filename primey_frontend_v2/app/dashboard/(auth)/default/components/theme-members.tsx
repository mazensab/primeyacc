"use client";

import React from "react";

import { Check, ChevronsDownIcon, InfoIcon } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const roles = [
  {
    id: 1,
    name: "Viewer",
    description: "Can view and comment."
  },
  {
    id: 2,
    name: "Developer",
    description: "Can view, comment and edit."
  },
  {
    id: 3,
    name: "Billing",
    description: "Can view, comment and manage billing."
  },
  {
    id: 4,
    name: "Owner",
    description: "Admin-level access to all resources."
  }
];

const members = [
  {
    id: 1,
    name: "Toby Belhome",
    email: "contact@bundui.io",
    avatar: `https://i.pravatar.cc/150?img=1`,
    role_id: 1
  },
  {
    id: 2,
    name: "Jackson Lee",
    email: "pre@example.com",
    avatar: `https://i.pravatar.cc/150?img=2`,
    role_id: 2
  },
  {
    id: 3,
    name: "Hally Gray",
    email: "hally@site.com",
    avatar: `https://i.pravatar.cc/150?img=3`,
    role_id: 1
  }
];

export function TeamMembersCard() {
  const [data, setData] = React.useState(members);
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          Team Members
          <Tooltip>
            <TooltipTrigger asChild>
              <InfoIcon className="text-muted-foreground size-3.5" />
            </TooltipTrigger>
            <TooltipContent>Invite your team members to collaborate.</TooltipContent>
          </Tooltip>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {data.map((member, key) => (
          <div key={key} className="flex min-w-0 items-center justify-between gap-4">
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <Avatar className="shrink-0">
                <AvatarImage src={member.avatar} />
                <AvatarFallback>OM</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 overflow-hidden">
                <p className="truncate text-sm leading-none font-medium">{member.name}</p>
                <p className="text-muted-foreground truncate text-sm">{member.email}</p>
              </div>
            </div>
            <Popover
              open={openIndex === key}
              onOpenChange={(isOpen) => setOpenIndex(isOpen ? key : null)}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="shrink-0">
                  {roles.find((role) => role.id === member.role_id)?.name}{" "}
                  <ChevronsDownIcon className="text-muted-foreground ml-2 h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0" align="end">
                <Command>
                  <CommandInput placeholder="Select new role..." />
                  <CommandList>
                    <CommandEmpty>No roles found.</CommandEmpty>
                    <CommandGroup>
                      {roles.map((role, key) => (
                        <CommandItem
                          key={key}
                          onSelect={(currentValue) => {
                            setData((prevData) =>
                              prevData.map((m) =>
                                m.id === member.id ? { ...m, role_id: role.id } : m
                              )
                            );
                            setOpenIndex(null);
                          }}
                          className="teamaspace-y-1 flex items-start px-4 py-2">
                          <div>
                            <p>{role.name}</p>
                            <p className="text-muted-foreground text-sm">{role.description}</p>
                          </div>
                          {member.role_id === role.id ? (
                            <Check className="text-primary ml-auto flex size-4" />
                          ) : null}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
