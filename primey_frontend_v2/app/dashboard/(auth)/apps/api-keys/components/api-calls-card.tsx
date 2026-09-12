import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CountAnimation from "@/components/ui/custom/count-animation";
import { Badge } from "@/components/ui/badge";

export function ApiCallsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>API Calls</CardTitle>
        <CardAction>
          <Badge variant="success">2.3%</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="font-display text-3xl">
          <CountAnimation number={4328} />
        </div>
        <div className="text-muted-foreground text-sm">More than last month</div>
      </CardContent>
    </Card>
  );
}
