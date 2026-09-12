"use client";

import { ArrowDownIcon, ArrowRightIcon, ArrowUpIcon } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const data = [
  {
    name: "MRR",
    value: "$34.1K",
    change: "+6.1%",
    changeType: "positive",
    href: "#"
  },
  {
    name: "Users",
    value: "500.1K",
    change: "+19.2%",
    changeType: "positive",
    href: "#"
  },
  {
    name: "User growth",
    value: "11.3%",
    change: "-1.2%",
    changeType: "negative",
    href: "#"
  }
];

export default function StatCards() {
  return (
    <div className="flex w-full items-center justify-center">
      <div className="grid w-full grid-cols-1 gap-4 lg:gap-6 md:grid-cols-3">
        {data.map((item) => (
          <Card key={item.name}>
            <CardHeader>
              <CardTitle className="truncate">{item.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-foreground text-3xl font-display">{item.value}</span>
                <Badge variant={item.changeType === "positive" ? "success" : "destructive"}>
                  {item.changeType === "positive" ? <ArrowUpIcon /> : <ArrowDownIcon />}
                  {item.change.replace(/^[+-]/, "")}
                </Badge>
              </div>
              <Separator className="my-3" />
              <Button
                variant="link"
                asChild
                className="text-muted-foreground w-full justify-between hover:text-foreground h-auto p-0 text-xs">
                <Link href="#">
                  View more <ArrowRightIcon className="size-3" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
