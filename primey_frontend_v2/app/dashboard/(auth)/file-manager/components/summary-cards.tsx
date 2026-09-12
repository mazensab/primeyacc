import { ArrowRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CountAnimation from "@/components/ui/custom/count-animation";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";

interface DataType {
  type: string;
  count: number;
  size: string;
  color: string;
  indicatorColor: string;
  usagePercentage: number;
}

const data: DataType[] = [
  {
    type: "Documents",
    count: 1390,
    size: "2.1 GB",
    color: "text-blue-500",
    indicatorColor: "bg-blue-500",
    usagePercentage: 35
  },
  {
    type: "Images",
    count: 5678,
    size: "3.8 GB",
    color: "text-green-500",
    indicatorColor: "bg-green-500",
    usagePercentage: 62
  },
  {
    type: "Videos",
    count: 901,
    size: "7.5 GB",
    color: "text-red-500",
    indicatorColor: "bg-red-500",
    usagePercentage: 89
  },
  {
    type: "Others",
    count: 234,
    size: "1.2 GB",
    color: "text-yellow-500",
    indicatorColor: "bg-yellow-500",
    usagePercentage: 28
  }
];

export function SummaryCards() {
  return (
    <div className="grid gap-4 lg:gap-6 md:grid-cols-2 lg:grid-cols-4">
      {data.map((item, key) => (
        <Card key={key}>
          <CardHeader>
            <CardTitle>{item.type}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="font-display text-2xl lg:text-3xl">
              <CountAnimation number={item.count} />
            </div>
            <div className="space-y-2">
              <Progress value={item.usagePercentage} indicatorColor={item.indicatorColor} />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">{item.size} used</span>
                <span className="text-muted-foreground text-sm">{item.usagePercentage}%</span>
              </div>
            </div>
            <Separator />
            <div className="text-end">
              <Button
                variant="link"
                asChild
                className="text-muted-foreground hover:text-foreground h-auto p-0 text-xs">
                <Link href="#">
                  View more <ArrowRightIcon className="size-3" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
