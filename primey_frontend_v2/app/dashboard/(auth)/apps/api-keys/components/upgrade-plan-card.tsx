"use client";

import { useState } from "react";
import { CheckIcon } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

const plans = [
  {
    id: "developer",
    name: "Developer",
    price: "$0",
    period: "forever",
    current: true,
    features: ["2,000 API calls per month", "2 API keys", "Community support"]
  },
  {
    id: "pro",
    name: "Pro",
    price: "$29",
    period: "per month",
    popular: true,
    features: [
      "50,000 API calls per month",
      "10 API keys",
      "Priority email support",
      "Usage analytics"
    ]
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "$99",
    period: "per month",
    features: [
      "Unlimited API calls",
      "Unlimited API keys",
      "Dedicated support and SLA",
      "Single sign-on (SSO)"
    ]
  }
];

function UpgradePlanDialog() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("pro");

  const selectedPlan = plans.find((plan) => plan.id === selected);
  const isCurrent = selectedPlan?.current;

  const handleUpgrade = () => {
    toast.success(`Upgraded to the ${selectedPlan?.name} plan`);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="-mt-3">
          Upgrade Plan
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upgrade your plan</DialogTitle>
          <DialogDescription>
            You used 215 of 2,000 API calls this month. Pick a plan that fits your usage.
          </DialogDescription>
        </DialogHeader>
        <div
          className="space-y-3"
          role="radiogroup"
          aria-label="Available plans">
          {plans.map((plan) => {
            const isSelected = plan.id === selected;
            return (
              <button
                key={plan.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => setSelected(plan.id)}
                className={cn(
                  "focus-visible:ring-ring/50 w-full rounded-xl border p-4 text-start transition-colors outline-none focus-visible:ring-3",
                  isSelected ? "border-primary bg-muted/50" : "hover:bg-muted/50"
                )}>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{plan.name}</span>
                  {plan.current && <Badge variant="outline">Current plan</Badge>}
                  {plan.popular && <Badge>Most popular</Badge>}
                  <span className="ms-auto text-end">
                    <span className="font-semibold">{plan.price}</span>{" "}
                    <span className="text-muted-foreground text-xs">/ {plan.period}</span>
                  </span>
                </div>
                <ul className="mt-3 space-y-1.5">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="text-muted-foreground flex items-center gap-2 text-sm">
                      <CheckIcon className="size-3.5 shrink-0 text-emerald-600" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleUpgrade} disabled={isCurrent}>
            {isCurrent ? "Current plan" : `Upgrade to ${selectedPlan?.name}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function UpgradePlanCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Developer Plan</CardTitle>
        <CardAction>
          <UpgradePlanDialog />
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-2">
        <Progress value={25} />
        <div className="text-muted-foreground text-sm">You used 215 of 2000 of your API</div>
      </CardContent>
    </Card>
  );
}
