import { InfoIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function WebsiteAnalyticsCard() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          Website Analytics
          <Tooltip>
            <TooltipTrigger asChild>
              <InfoIcon className="text-muted-foreground size-3.5" />
            </TooltipTrigger>
            <TooltipContent>Total 28.5% Conversion Rate</TooltipContent>
          </Tooltip>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid h-full grid-cols-2 content-between gap-4">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="border-border w-12 border">
              432
            </Badge>
            <span>Direct</span>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="border-border w-12 border">
              216
            </Badge>
            <span>Organic</span>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="border-border w-12 border">
              29%
            </Badge>
            <span>Sessions</span>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="border-border w-12 border">
              2.3K
            </Badge>
            <span>Page Views</span>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="border-border w-12 border">
              1.6K
            </Badge>
            <span>Leads</span>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="border-border w-12 border">
              8%
            </Badge>
            <span>Conversions</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
