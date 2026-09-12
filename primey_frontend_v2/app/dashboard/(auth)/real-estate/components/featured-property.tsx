import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import type { FeaturedPropertyItem } from "../types";

interface FeaturedPropertyProps {
  item: FeaturedPropertyItem;
}

export function FeaturedProperty({ item }: FeaturedPropertyProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-baseline gap-2">
          {item.name}
          <span className="text-muted-foreground text-sm font-normal">{item.type}</span>
        </CardTitle>
        <CardAction>
          <Badge variant="secondary">Recommended to {item.leads} Leads</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="gap-4 space-y-4 lg:grid lg:grid-cols-2 lg:space-y-0">
        <div className="flex flex-col justify-center gap-3">
          <div className="bg-muted flex items-center justify-between rounded-lg px-4 py-3">
            <p className="text-muted-foreground text-sm">Sold</p>
            <p className="text-lg leading-none font-bold">{item.sold}</p>
          </div>
          <div className="bg-muted flex items-center justify-between rounded-lg px-4 py-3">
            <p className="text-muted-foreground text-sm">Rented</p>
            <p className="text-lg leading-none font-bold">{item.rented}</p>
          </div>
          <div className="bg-muted flex items-center justify-between rounded-lg px-4 py-3">
            <p className="text-muted-foreground text-sm">Views</p>
            <p className="text-lg leading-none font-bold">{item.views}</p>
          </div>
        </div>
        <figure className="order-first overflow-hidden lg:order-last">
          <img
            src={item.image}
            alt={item.name}
            className="aspect-video w-full rounded-lg object-cover lg:h-44"
          />
        </figure>
      </CardContent>
    </Card>
  );
}
