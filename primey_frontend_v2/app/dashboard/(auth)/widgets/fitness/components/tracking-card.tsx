import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

const history = [
  { label: "5d ago", distance: "10.37km" },
  { label: "8d ago", distance: "8.21km" },
  { label: "14d ago", distance: "9.54km" }
];

export function TrackingCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-muted-foreground font-medium">Tracking Now</CardTitle>
        <CardAction>
          <div className="flex gap-2">
            <Button variant="outline" size="icon-sm">
              <Pause />
            </Button>
            <Button variant="outline" size="icon-sm">
              <Play />
            </Button>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-4xl font-bold tabular-nums">00:22:50</div>
        <div className="grid grid-cols-3 gap-3">
          {history.map((item) => (
            <div key={item.label} className="bg-muted rounded-lg p-3 text-center">
              <p className="text-muted-foreground mb-1 text-xs">{item.label}</p>
              <p className="font-semibold tabular-nums">{item.distance}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
