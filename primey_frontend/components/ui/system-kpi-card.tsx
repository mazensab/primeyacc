import Image from "next/image";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
export type SystemKpiCardProps = {
  title: string;
  value: number | string;
  description: string;
  icon: LucideIcon;
  href?: string;
  className?: string;
  currencyIcon?: boolean;
  currencyAlt?: string;
  valueSuffix?: string;
};
function formatKpiValue(
  value: number | string,
) {
  if (typeof value === "number") {
    return new Intl.NumberFormat(
      "en-US",
      {
        maximumFractionDigits: 0,
      },
    ).format(value);
  }
  return value;
}
export function SystemKpiCard({
  title,
  value,
  description,
  icon: Icon,
  href,
  className,
  currencyIcon = false,
  currencyAlt = "SAR",
  valueSuffix,
}: SystemKpiCardProps) {
  const content = (
    <div className="flex h-full min-h-[126px] items-start justify-between gap-4 p-5">
      <div className="flex min-w-0 flex-1 flex-col self-stretch text-start">
        <p className="truncate text-sm leading-5 text-muted-foreground">
          {title}
        </p>
        <div className="mt-1.5 flex items-center gap-1.5">
          <span
            dir="ltr"
            lang="en"
            className="text-2xl font-bold leading-none tracking-tight text-foreground tabular-nums"
          >
            {formatKpiValue(value)}
          </span>
          {valueSuffix ? (
            <span className="shrink-0 text-sm font-medium leading-none text-muted-foreground">
              {valueSuffix}
            </span>
          ) : null}
          {currencyIcon ? (
            <Image
              src="/currency/sar.svg"
              alt={currencyAlt}
              width={17}
              height={17}
              className="h-[17px] w-[17px] shrink-0 opacity-80"
            />
          ) : null}
        </div>
        <p className="mt-auto line-clamp-2 pt-3 text-xs leading-5 text-muted-foreground">
          {description}
        </p>
      </div>
      <span className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-primary/5 text-primary shadow-sm transition group-hover:border-primary/30 group-hover:bg-primary group-hover:text-primary-foreground dark:bg-white/[0.06]">
        <Icon className="h-5 w-5" />
      </span>
    </div>
  );
  return (
    <Card
      className={cn(
        "group h-full gap-0 overflow-hidden rounded-lg border bg-card bg-none py-0 shadow-none backdrop-blur-none transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm before:hidden after:hidden",
        className,
      )}
    >
      {href ? (
        <Link
          href={href}
          className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {content}
        </Link>
      ) : (
        <div className="h-full">
          {content}
        </div>
      )}
    </Card>
  );
}
