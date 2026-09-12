import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CountAnimation from "@/components/ui/custom/count-animation";
import { Badge } from "@/components/ui/badge";

export function FailedConversionsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Failed conversions</CardTitle>
        <CardAction>
          <Badge variant="destructive">-0.3%</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="font-display text-3xl">
          <CountAnimation number={23} />
        </div>
        <div className="text-muted-foreground text-sm">More than last month</div>
      </CardContent>
    </Card>
  );
}
