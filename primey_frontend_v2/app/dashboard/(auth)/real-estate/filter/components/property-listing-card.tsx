"use client";

import { Bath, BedDouble, Heart, Home, MapPin, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RealEstateProperty } from "../../types";

export type Property = RealEstateProperty;

type PropertyListingCardProps = {
  property: Property;
  isFavorite: boolean;
  onOpenDetail: (property: Property) => void;
  onToggleFavorite: (id: number, event: React.MouseEvent) => void;
  formatPrice: (price: number) => string;
};

export function PropertyListingCard({
  property,
  isFavorite,
  onOpenDetail,
  onToggleFavorite,
  formatPrice
}: PropertyListingCardProps) {
  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-lg"
      onClick={() => onOpenDetail(property)}>
      <div className="relative">
        <img
          src={property.image}
          alt={property.title}
          className="h-44 w-full rounded-lg object-cover"
        />
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          onClick={(event) => onToggleFavorite(property.id, event)}
          className={cn(
            "bg-background/80 text-muted-foreground hover:text-destructive absolute top-2 right-2 rounded-full backdrop-blur-sm",
            {
              "text-destructive": isFavorite
            }
          )}>
          <Heart fill={isFavorite ? "currentColor" : "none"} />
        </Button>
        <div className="bg-background/90 absolute bottom-2 left-2 flex items-baseline gap-1.5 rounded-full px-3 py-1 text-sm shadow-xs backdrop-blur-sm">
          {property.originalPrice && (
            <s className="text-muted-foreground text-xs">{formatPrice(property.originalPrice)}</s>
          )}
          <span className="font-semibold">{formatPrice(property.price)}</span>
          <span className="text-muted-foreground text-xs">/{property.priceType}</span>
        </div>
      </div>
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-semibold">{property.title}</h3>
            <div className="text-muted-foreground mt-0.5 flex items-center gap-1 text-sm">
              <MapPin className="size-3 shrink-0" />
              <span className="truncate">{property.address}</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1 text-sm">
            <Star className="size-3.5 fill-amber-500 text-amber-500" />
            <span className="font-medium">{property.rating.toFixed(1)}</span>
          </div>
        </div>
        <div className="text-muted-foreground flex items-center justify-between border-t pt-3 text-sm">
          <span className="flex items-center gap-1.5">
            <Home className="size-3.5" />
            {property.rooms} Rooms
          </span>
          <span className="flex items-center gap-1.5">
            <BedDouble className="size-3.5" />
            {property.beds} Beds
          </span>
          <span className="flex items-center gap-1.5">
            <Bath className="size-3.5" />
            {property.baths} Baths
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
