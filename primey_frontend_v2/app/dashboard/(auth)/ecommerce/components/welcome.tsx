import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function EcommerceWelcomeCard() {
  return (
    <Card className="bg-muted relative overflow-hidden md:col-span-12 lg:col-span-4">
      <CardContent>
        <div className="mb-4 space-y-2">
          <div className="font-semibold text-2xl">Congratulations Toby! 🎉</div>
          <div className="text-muted-foreground">Best seller of the month</div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-display text-3xl">$15,231.89</div>
            <div className="text-muted-foreground text-xs">
              <span className="text-green-500">+65%</span> from last month
            </div>
          </div>
          <Button variant="outline">View Sales</Button>
        </div>
      </CardContent>
      <img
        width="800px"
        height="300px"
        src={`/star-shape.png`}
        className="pointer-events-none absolute inset-0 aspect-auto"
        alt="..."
      />
    </Card>
  );
}
