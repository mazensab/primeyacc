import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const totalGb = 2048;

const segments = [
  { label: "Videos", value: 522, className: "bg-teal-500" },
  { label: "Audio", value: 320, className: "bg-amber-500" },
  { label: "Photos", value: 78, className: "bg-red-500" },
  { label: "Document", value: 200, className: "bg-blue-500" },
  { label: "Others", value: 112, className: "bg-purple-500" }
];

const usedGb = segments.reduce((acc, segment) => acc + segment.value, 0);
const freeGb = totalGb - usedGb;

export function StorageOverviewCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{usedGb.toLocaleString("en-US")} GB Used From 2 TB</CardTitle>
        <CardAction>
          <span className="text-muted-foreground text-sm font-medium">
            {freeGb.toLocaleString("en-US")} GB Free
          </span>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted-foreground/20 flex h-2 overflow-hidden rounded-full">
          {segments.map((segment) => (
            <span
              key={segment.label}
              className={segment.className}
              style={{ width: `${(segment.value / totalGb) * 100}%` }}
            />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {segments.map((segment) => (
            <div key={segment.label} className="flex items-center gap-2 text-sm">
              <span className={`size-2 rounded-full ${segment.className}`} />
              {segment.label}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
