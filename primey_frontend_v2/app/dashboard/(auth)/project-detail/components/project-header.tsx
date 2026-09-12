import { TrendingUpIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

import { AddNotePopover } from "./add-note-popover";
import { SharePopover } from "./share-popover";

export function ProjectHeader() {
  return (
    <Card>
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-4">
            <div className="bg-primary/10 text-primary hidden size-14 shrink-0 items-center justify-center rounded-xl sm:flex">
              <TrendingUpIcon className="size-6" />
            </div>
            <div className="space-y-1.5">
              <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <Badge variant="success">On track</Badge>
                <span>23 days to deadline</span>
                <span aria-hidden>·</span>
                <span>Started Jan 8, 2026</span>
              </div>
              <h1 className="text-xl font-bold tracking-tight lg:text-2xl">SaaS Blog Growth</h1>
              <p className="text-muted-foreground max-w-2xl text-sm">
                Acme Cloud. Quadruple organic traffic via a 24-piece content engine. Targeting
                non-brand keywords with high commercial intent.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <SharePopover />
            <AddNotePopover />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Project progress · 16 of 24 tasks done</span>
            <span className="font-semibold">68%</span>
          </div>
          <Progress value={68} />
        </div>
      </CardContent>
    </Card>
  );
}
