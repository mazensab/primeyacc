"use client";

import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import { motion } from "motion/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

const listedPercent = 65;
const soldPercent = 35;

const listedCount = 823;
const soldCount = 409;
const totalBars = 30;
const listedBarColor = "rgb(22 163 74)";
const soldBarColor = "rgb(22 101 52)";

export function PropertyOverviewCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Property Overview</CardTitle>
        <CardAction>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="More options">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>View full report</DropdownMenuItem>
              <DropdownMenuItem>Download summary</DropdownMenuItem>
              <DropdownMenuItem>Adjust period</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-end gap-2">
          <p className="text-3xl leading-none font-semibold">1.323</p>
          <p className="text-muted-foreground mb-1 text-sm leading-none">Total Property</p>
        </div>

        <div className="grid grid-cols-30 gap-1.5">
          {Array.from({ length: totalBars }, (_, i) => {
            const listedBars = Math.round((listedCount / (listedCount + soldCount)) * totalBars);
            const barColor = i < listedBars ? listedBarColor : soldBarColor;
            return (
              <motion.div
                key={i}
                className="h-10 rounded-sm"
                style={{ backgroundColor: barColor }}
                initial={{ opacity: 0, scaleY: 0.25 }}
                animate={{ opacity: 1, scaleY: 1 }}
                transition={{ delay: i * 0.04, duration: 0.3, ease: "easeOut" }}
              />
            );
          })}
        </div>

        <div className="space-y-3">
          <div className="bg-muted flex items-center gap-2 rounded-md p-4">
            <span className="size-2 rounded-full bg-green-600" />
            <p className="text-sm font-medium">Listed Property</p>
            <p className="text-muted-foreground ms-auto text-sm">{listedCount} </p>
            <Badge variant="success">{listedPercent}%</Badge>
          </div>

          <div className="bg-muted flex items-center gap-2 rounded-md p-4">
            <span className="size-2 rounded-full bg-green-800" />
            <p className="text-sm font-medium">Property Sold</p>
            <p className="text-muted-foreground ms-auto text-sm">{soldCount} </p>
            <Badge variant="success">{soldPercent}%</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
