import Image from "next/image";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  title: string;
  value: string | number;
  description: string;
  sarLabel: string;
  icon: LucideIcon;
};

function amount(value: string | number) {
  const parsed = Number(String(value ?? 0).replace(/,/g, ""));
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(parsed) ? parsed : 0);
}

export function CompanyFinancialCard({ title, value, description, sarLabel, icon: TitleIcon }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle icon={TitleIcon} iconPosition="opposite">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="font-display flex items-center gap-2 text-2xl lg:text-3xl">
          <Image src="/currency/sar.svg" width={22} height={22} alt={sarLabel} />
          <span className="tabular-nums">{amount(value)}</span>
        </div>
        <div className="text-muted-foreground text-xs">{description}</div>
      </CardContent>
    </Card>
  );
}
