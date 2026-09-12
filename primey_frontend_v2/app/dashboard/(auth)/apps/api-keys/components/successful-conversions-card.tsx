import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CountAnimation from "@/components/ui/custom/count-animation";
import { Badge } from "@/components/ui/badge";

export function SuccessfulConversionsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Successful conversions</CardTitle>
        <CardAction>
          <Badge variant="success">+10.3%</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="font-display text-3xl">
          <CountAnimation number={1204} />
        </div>
        <div className="text-muted-foreground text-sm">Less than last month</div>
      </CardContent>
    </Card>
  );
}
