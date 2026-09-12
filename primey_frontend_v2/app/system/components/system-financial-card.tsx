import Image from "next/image";
import { ArrowDownIcon, ArrowUpIcon, MinusIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Direction = "up" | "down" | "stable";

type Props = {
  title: string;
  value: string | number;
  changePercent: number | null;
  direction: Direction;
  comparisonLabel: string;
  noBaselineLabel: string;
  sarLabel: string;
  invertSentiment?: boolean;
};

function amount(value: string | number) {
  const parsed = Number(String(value ?? 0).replace(/,/g, ""));
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(parsed) ? parsed : 0);
}

export function SystemFinancialCard({
  title,
  value,
  changePercent,
  direction,
  comparisonLabel,
  noBaselineLabel,
  sarLabel,
  invertSentiment = false,
}: Props) {
  const effectivePositive =
    direction === "stable"
      ? null
      : invertSentiment
        ? direction === "down"
        : direction === "up";
  const Icon =
    direction === "up"
      ? ArrowUpIcon
      : direction === "down"
        ? ArrowDownIcon
        : MinusIcon;
  const tone =
    effectivePositive === null
      ? "text-muted-foreground"
      : effectivePositive
        ? "text-green-500"
        : "text-red-500";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="font-display flex items-center gap-2 text-2xl lg:text-3xl">
          <Image src="/currency/sar.svg" width={22} height={22} alt={sarLabel} />
          <span className="tabular-nums">{amount(value)}</span>
        </div>
        <div className="flex items-center text-xs">
          <Icon className={`me-1 size-3 ${tone}`} />
          <span className={`font-medium ${tone}`}>
            {changePercent === null ? "—" : `${Math.abs(changePercent).toFixed(1)}%`}
          </span>
          <span className="text-muted-foreground ms-1">
            {changePercent === null ? noBaselineLabel : comparisonLabel}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
