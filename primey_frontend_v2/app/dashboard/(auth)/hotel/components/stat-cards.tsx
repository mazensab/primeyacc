import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical, Clock, LogOut, Users, DollarSign, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  {
    title: "Today's check-in",
    value: "200",
    unitNumber: "1,000",
    color: "cyan" as const,
    icon: "checkin" as const
  },
  {
    title: "Today check-out",
    value: "34",
    unitNumber: "520",
    color: "green" as const,
    icon: "checkout" as const
  },
  {
    title: "Total guests",
    value: "3432",
    unitNumber: "152",
    color: "pink" as const,
    icon: "guests" as const
  },
  {
    title: "Total amount",
    value: "$668,726",
    unitNumber: "266",
    color: "yellow" as const,
    icon: "amount" as const
  }
];

const colorClasses = {
  cyan: {
    card: "bg-linear-to-tr from-cyan-200/40 to-cyan-100/40 dark:from-cyan-950/40 dark:to-cyan-900/40 border-cyan-300 dark:border-cyan-950",
  },
  green: {
    card: "bg-linear-to-tr from-green-200/40 to-green-100/40 dark:from-green-950/40 dark:to-green-900/40 border-green-300 dark:border-green-950",
  },
  pink: {
    card: "bg-linear-to-tr from-pink-200/40 to-pink-100/40 dark:from-pink-950/40 dark:to-pink-900/40 border-pink-200 dark:border-pink-950",
  },
  yellow: {
    card: "bg-linear-to-tr from-yellow-200/40 to-yellow-100/40 dark:from-yellow-950/40 dark:to-yellow-900/40 border-yellow-300 dark:border-yellow-950",
  }
};

const iconMap = {
  checkin: Clock,
  checkout: LogOut,
  guests: Users,
  amount: DollarSign,
  loans: CreditCard
};

export function StatCards() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item, index) => {
        const IconComponent = iconMap[item.icon];
        return (
          <Card key={index} className={`${colorClasses[item.color].card} shadow-none`}>
            <CardHeader>
              <CardTitle>{item.title}</CardTitle>
              <CardAction>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm">
                      <span className="sr-only">Open menu</span>
                      <MoreVertical />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>View Details</DropdownMenuItem>
                    <DropdownMenuItem>Export</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardAction>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-full border",
                  )}>
                  <IconComponent className="size-4" />
                </div>
                <div className="space-y-0.5">
                  <p
                    className={cn(
                      "text-2xl font-display lg:text-3xl",
                    )}>
                    {item.value}
                  </p>
                  <p className="text-muted-foreground text-sm">Unit Number: {item.unitNumber}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
