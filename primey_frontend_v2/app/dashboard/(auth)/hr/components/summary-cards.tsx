import { ArrowDownRightIcon, ArrowUpRightIcon } from "lucide-react";

import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import CardMenu from "./card-menu";

const workforce = [
  {
    label: "Fulltime Employee",
    value: 948,
    change: 50,
    up: true,
    className: "bg-green-500/10 text-green-800 dark:text-green-300",
    badgeClass: "bg-green-500/15 text-green-700 dark:text-green-400"
  },
  {
    label: "Freelance Employee",
    value: 250,
    change: 10,
    up: false,
    className: "bg-amber-500/10 text-amber-800 dark:text-amber-300",
    badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-400"
  }
];

const attendanceSegments = [
  { label: "Sick Leave", share: 10, color: "bg-amber-400/70" },
  { label: "Day Off", share: 15, color: "bg-sky-400/70" },
  { label: "On time", share: 75, color: "bg-violet-400/70" }
];

const devices = [
  { label: "Macbook", value: 80, className: "text-violet-400/80" },
  { label: "Keyboard", value: 13, className: "text-amber-400/80" },
  { label: "Headphones", value: 7, className: "text-orange-400/80" }
];

/* Semicircle gauge geometry: 180° sweep, 8° gap between segments */
const GAUGE_GAP = 8;
const polar = (deg: number) => {
  const rad = (deg * Math.PI) / 180;
  return { x: 100 + 80 * Math.cos(rad), y: 100 - 80 * Math.sin(rad) };
};

const devicesTotal = devices.reduce((sum, device) => sum + device.value, 0);

const gaugeSegments = (() => {
  const usable = 180 - GAUGE_GAP * (devices.length - 1);
  let start = 180;
  return devices.map((device) => {
    const sweep = (device.value / devicesTotal) * usable;
    const from = polar(start);
    const to = polar(start - sweep);
    start -= sweep + GAUGE_GAP;
    return {
      ...device,
      d: `M ${from.x} ${from.y} A 80 80 0 0 1 ${to.x} ${to.y}`
    };
  });
})();

export default function SummaryCards() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:gap-6 md:grid-cols-2 xl:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Total Employees</CardTitle>
          <CardAction>
            <CardMenu />
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-3">
          {workforce.map((item) => (
            <div
              key={item.label}
              className={cn("flex items-center justify-between rounded-lg p-3", item.className)}
            >
              <div className="flex items-center gap-2">
                <span className="font-display text-foreground text-2xl">{item.value}</span>
                <span
                  className={cn(
                    "flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-medium",
                    item.badgeClass
                  )}
                >
                  {item.up ? (
                    <ArrowUpRightIcon className="size-3" />
                  ) : (
                    <ArrowDownRightIcon className="size-3" />
                  )}
                  {item.change}
                </span>
              </div>
              <span className="text-sm font-medium">{item.label}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Attendance Overview</CardTitle>
          <CardAction>
            <CardMenu />
          </CardAction>
        </CardHeader>
        <CardContent className="flex h-full flex-col justify-between gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-display text-3xl">90.3%</span>
            <span className="text-sm">
              <span className="inline-flex items-center gap-0.5 font-medium text-green-600">
                <ArrowUpRightIcon className="size-3.5" />
                20%
              </span>
              <span className="text-muted-foreground ml-1">since last month</span>
            </span>
          </div>
          <div>
            <div className="mb-4 flex h-2 gap-1">
              {attendanceSegments.map((segment) => (
                <span
                  key={segment.label}
                  className={cn("rounded-full", segment.color)}
                  style={{ width: `${segment.share}%` }}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1">
              {attendanceSegments.map((segment) => (
                <span key={segment.label} className="flex items-center gap-1.5 text-sm">
                  <span className={cn("size-2 rounded-full", segment.color)} />
                  <span className="text-muted-foreground">{segment.label}</span>
                </span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2 xl:col-span-1">
        <CardHeader>
          <CardTitle>Today Used Devices</CardTitle>
          <CardAction>
            <CardMenu />
          </CardAction>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-6">
          <div className="relative shrink-0">
            <svg viewBox="0 0 200 110" className="w-40" aria-hidden="true">
              {gaugeSegments.map((segment) => (
                <path
                  key={segment.label}
                  d={segment.d}
                  className={segment.className}
                  stroke="currentColor"
                  strokeWidth="14"
                  strokeLinecap="round"
                  fill="none"
                />
              ))}
            </svg>
            <div className="absolute inset-x-0 bottom-0 text-center">
              <div className="font-display text-2xl">{devicesTotal}</div>
              <div className="text-muted-foreground text-sm">Overall</div>
            </div>
          </div>
          <div className="grow space-y-3">
            {devices.map((device) => (
              <div key={device.label} className="flex items-center gap-2 text-sm">
                <span className={cn("h-4 w-1 rounded-full bg-current", device.className)} />
                <span className="font-semibold tabular-nums">
                  {String(device.value).padStart(2, "0")}
                </span>
                <span className="text-muted-foreground ms-auto">{device.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
