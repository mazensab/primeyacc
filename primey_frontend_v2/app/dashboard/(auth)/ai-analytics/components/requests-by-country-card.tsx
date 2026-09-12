"use client";

import { EllipsisIcon, InfoIcon } from "lucide-react";
import Flag from "react-world-flags";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const countries = [
  { name: "United States (US)", code: "US", requests: 4863, width: 66 },
  { name: "Australia (AU)", code: "AU", requests: 5459, width: 74 },
  { name: "Philippines (PH)", code: "PH", requests: 4592, width: 52 },
  { name: "Netherlands (NL)", code: "NL", requests: 963, width: 32 },
  { name: "United Kingdom (UK)", code: "GB", requests: 3952, width: 60 }
];

export function RequestsByCountryCard() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          Requests
          <Tooltip>
            <TooltipTrigger asChild>
              <InfoIcon className="text-muted-foreground size-3.5" />
            </TooltipTrigger>
            <TooltipContent>Requests by country, last 28 days</TooltipContent>
          </Tooltip>
        </CardTitle>
        <CardAction>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="More options">
                <EllipsisIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>View All</DropdownMenuItem>
              <DropdownMenuItem>Export</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {countries.map((country) => (
          <div key={country.code} className="flex items-center justify-between gap-4">
            <div
              className="bg-muted flex min-w-0 items-center gap-2.5 rounded-lg px-3 py-2.5"
              style={{ width: `${country.width}%` }}>
              <Flag code={country.code} className="h-3.5 w-5 shrink-0 rounded-xs object-cover" />
              <span className="truncate font-medium">{country.name}</span>
            </div>
            <span className="text-muted-foreground shrink-0 tabular-nums">
              {country.requests.toLocaleString("en-US")}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
