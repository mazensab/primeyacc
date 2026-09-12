"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis
} from "@/components/ui/pagination";
import {
  MapPin,
  Heart,
  Building2,
  Building,
  Store,
  Hospital,
  Phone,
  Mail,
  Calendar,
  SlidersHorizontal,
  Home,
  BedDouble,
  Bath,
  Star,
  ArrowUpDown
} from "lucide-react";
import { Property, PropertyListingCard } from "./property-listing-card";
import { usePropertyFilterStore } from "../../store";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface PropertyListingProps {
  properties: Property[];
}

const propertyTypes = [
  { id: "house", label: "House", icon: Home },
  { id: "medical", label: "Medical", icon: Hospital },
  { id: "office", label: "Office", icon: Building },
  { id: "shophouse", label: "Shophouse", icon: Store },
  { id: "apartment", label: "Apartment", icon: Building2 }
];

const amenitiesList = [
  "Backyard",
  "Fireplace",
  "Garden",
  "Garage",
  "Gym",
  "Swimming Pool",
  "Surveillance Cameras",
  "Laundry"
];

const ITEMS_PER_PAGE = 9;

export function PropertyListing({ properties }: PropertyListingProps) {
  const {
    location,
    setLocation,
    priceRange,
    setPriceRange,
    customRange,
    setCustomRange,
    selectedType,
    setSelectedType,
    bedroom,
    setBedroom,
    selectedAmenities,
    toggleAmenity,
    resetFilters
  } = usePropertyFilterStore();
  const [favorites, setFavorites] = useState<number[]>(
    properties.filter((p) => p.isFavorite).map((p) => p.id)
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState("default");
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const toggleFavorite = (id: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setFavorites((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));
  };

  const openPropertyDetail = (property: Property) => {
    setSelectedProperty(property);
    setSheetOpen(true);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [location, priceRange, customRange, selectedType, bedroom, selectedAmenities]);

  const filteredProperties = useMemo(() => {
    let result = [...properties];

    if (location !== "all") {
      result = result.filter((p) => p.location === location);
    }

    if (priceRange === "10k-20k") {
      result = result.filter((p) => p.price >= 10000 && p.price <= 20000);
    } else if (priceRange === "20k+") {
      result = result.filter((p) => p.price > 20000);
    } else if (priceRange === "custom") {
      result = result.filter((p) => p.price >= customRange[0] && p.price <= customRange[1]);
    }

    if (selectedType !== "all") {
      result = result.filter((p) => p.propertyType === selectedType);
    }

    if (bedroom !== "any") {
      const bedCount = bedroom === "4" ? 4 : parseInt(bedroom);
      result = result.filter((p) => (bedroom === "4" ? p.beds >= bedCount : p.beds === bedCount));
    }

    if (selectedAmenities.length > 0) {
      result = result.filter((p) => selectedAmenities.every((a) => p.amenities.includes(a)));
    }

    switch (sortBy) {
      case "price-low":
        result.sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        result.sort((a, b) => b.price - a.price);
        break;
      case "rating":
        result.sort((a, b) => b.rating - a.rating);
        break;
      default:
        break;
    }

    return result;
  }, [
    properties,
    location,
    priceRange,
    customRange,
    selectedType,
    bedroom,
    selectedAmenities,
    sortBy
  ]);

  const totalPages = Math.ceil(filteredProperties.length / ITEMS_PER_PAGE);
  const paginatedProperties = filteredProperties.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("ellipsis");
      for (
        let i = Math.max(2, currentPage - 1);
        i <= Math.min(totalPages - 1, currentPage + 1);
        i++
      ) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push("ellipsis");
      pages.push(totalPages);
    }
    return pages;
  };

  const getPropertyTypeLabel = (type: string) => {
    return propertyTypes.find((t) => t.id === type)?.label || type;
  };

  const filterSections = (
    <>
      <div>
        <Label className="mb-2 block text-sm font-medium">Location</Label>
        <Select
          value={location}
          onValueChange={(v) => {
            setLocation(v);
            setCurrentPage(1);
          }}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            <SelectItem value="jakarta">Jakarta, Indonesia</SelectItem>
            <SelectItem value="bali">Bali, Indonesia</SelectItem>
            <SelectItem value="surabaya">Surabaya, Indonesia</SelectItem>
            <SelectItem value="new-york">New York, USA</SelectItem>
            <SelectItem value="ohio">Ohio, USA</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="mb-3 block text-sm font-medium">Price Range</Label>
        <RadioGroup
          value={priceRange}
          onValueChange={(v) => {
            setPriceRange(v);
            setCurrentPage(1);
          }}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="all" id="r0" />
            <Label htmlFor="r0" className="text-sm font-normal">
              All Prices
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="10k-20k" id="r1" />
            <Label htmlFor="r1" className="text-sm font-normal">
              $10,000 - $20,000
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="20k+" id="r2" />
            <Label htmlFor="r2" className="text-sm font-normal">
              More Than $20,000
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="custom" id="r3" />
            <Label htmlFor="r3" className="text-sm font-normal">
              Custom
            </Label>
          </div>
        </RadioGroup>
        {priceRange === "custom" && (
          <div className="mt-4">
            <div className="text-muted-foreground mb-2 flex justify-between text-sm">
              <span>${(customRange[0] / 1000).toFixed(0)}K</span>
              <span>${(customRange[1] / 1000).toFixed(0)}K</span>
            </div>
            <Slider
              value={customRange}
              onValueChange={(v) => {
                setCustomRange(v);
                setCurrentPage(1);
              }}
              min={1000}
              max={100000}
              step={1000}
              className="w-full"
            />
          </div>
        )}
      </div>

      <div>
        <Label className="mb-3 block text-sm font-medium">Property Type</Label>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedType === "all" ? "default" : "outline"}
            size="sm"
            className="rounded-full"
            onClick={() => {
              setSelectedType("all");
              setCurrentPage(1);
            }}>
            All
          </Button>
          {propertyTypes.map((type) => {
            const Icon = type.icon;
            const isSelected = selectedType === type.id;
            return (
              <Button
                key={type.id}
                variant={isSelected ? "default" : "outline"}
                size="sm"
                className="rounded-full"
                onClick={() => {
                  setSelectedType(type.id);
                  setCurrentPage(1);
                }}>
                <Icon />
                {type.label}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <Label className="mb-2 block text-sm font-medium">Room</Label>
          <Select
            value={bedroom}
            onValueChange={(v) => {
              setBedroom(v);
              setCurrentPage(1);
            }}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              <SelectItem value="1">1</SelectItem>
              <SelectItem value="2">2</SelectItem>
              <SelectItem value="3">3</SelectItem>
              <SelectItem value="4">4+</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="mb-3 block text-sm font-medium">Amenities</Label>
        <div className="flex flex-wrap gap-2">
          {amenitiesList.map((amenity) => {
            const isSelected = selectedAmenities.includes(amenity);
            return (
              <Button
                key={amenity}
                variant={isSelected ? "default" : "outline"}
                size="sm"
                className="rounded-full"
                onClick={() => {
                  toggleAmenity(amenity);
                  setCurrentPage(1);
                }}>
                {amenity}
              </Button>
            );
          })}
        </div>
      </div>

      <Button className="w-full" onClick={() => setFilterSheetOpen(false)}>
        Apply Now
      </Button>
    </>
  );

  return (
    <div className="flex gap-4">
      <aside className="hidden w-80 shrink-0 xl:block">
        <Card>
          <CardHeader>
            <CardTitle>Filter</CardTitle>
            <CardAction>
              <Button variant="link" onClick={resetFilters} size="xs">
                Reset
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-6">{filterSections}</CardContent>
        </Card>
      </aside>

      <main className="flex-1">
        <div className="mb-4 flex justify-between gap-4 sm:items-center">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="xl:hidden"
              onClick={() => setFilterSheetOpen(true)}>
              <SlidersHorizontal />
            </Button>
            <h2 className="text-2xl font-semibold">Property List</h2>
          </div>
          <div className="flex items-center gap-2">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="max-sm:w-8 max-sm:justify-center max-sm:p-0 max-sm:*:data-[slot=select-value]:hidden max-sm:[&>svg:last-child]:hidden">
                <ArrowUpDown className="text-muted-foreground size-4 sm:hidden" />
                <SelectValue placeholder="Default" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Sort by: Default</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="rating">Highest Rating</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {paginatedProperties.length === 0 ? (
          <div className="flex h-64 items-center justify-center">
            <p className="text-muted-foreground">No properties found matching your criteria.</p>
          </div>
        ) : (
          <div className="mb-4 grid grid-cols-1 gap-4 lg:gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {paginatedProperties.map((property) => (
              <PropertyListingCard
                key={property.id}
                property={property}
                isFavorite={favorites.includes(property.id)}
                onOpenDetail={openPropertyDetail}
                onToggleFavorite={toggleFavorite}
                formatPrice={formatPrice}
              />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-between">
            <div className="text-muted-foreground flex flex-1 items-center gap-2 text-sm">
              <span className="hidden sm:inline">Showing Result:</span>
              <Badge variant="outline" className="font-medium">
                {filteredProperties.length === 0
                  ? "0"
                  : `${(currentPage - 1) * ITEMS_PER_PAGE + 1} - ${Math.min(
                      currentPage * ITEMS_PER_PAGE,
                      filteredProperties.length
                    )} of ${filteredProperties.length}`}
              </Badge>
            </div>
            <Pagination className="w-auto justify-end">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setCurrentPage(Math.max(1, currentPage - 1));
                    }}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
                {getPageNumbers().map((page, index) =>
                  page === "ellipsis" ? (
                    <PaginationItem key={`ellipsis-${index}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={page}>
                      <PaginationLink
                        href="#"
                        isActive={currentPage === page}
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentPage(page);
                        }}>
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  )
                )}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setCurrentPage(Math.min(totalPages, currentPage + 1));
                    }}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </main>

      <Drawer direction="left" open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
        <DrawerContent className="overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <DrawerTitle className="text-lg font-semibold">Filter</DrawerTitle>
              <Button variant="link" onClick={resetFilters} size="xs">
                Reset
              </Button>
            </div>
            <Separator className="my-4" />
            <div className="space-y-6">{filterSections}</div>
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer direction="right" open={sheetOpen} onOpenChange={setSheetOpen}>
        <DrawerContent className="overflow-y-auto">
          <DrawerTitle className="sr-only">
            {selectedProperty?.title ?? "Property details"}
          </DrawerTitle>
          {selectedProperty && (
            <>
              <div className="relative">
                <img
                  src={selectedProperty.image}
                  alt={selectedProperty.title}
                  className="aspect-video w-full object-cover"
                />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => toggleFavorite(selectedProperty.id)}
                  className={cn(
                    "bg-background text-muted-foreground hover:text-destructive absolute top-3 left-3 rounded-full",
                    {
                      "text-destructive": favorites.includes(selectedProperty.id)
                    }
                  )}>
                  <Heart fill={favorites.includes(selectedProperty.id) ? "currentColor" : "none"} />
                </Button>
              </div>
              <div className="p-4">
                <div className="mb-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-lg font-bold sm:text-xl">{selectedProperty.title}</h4>
                      <div className="text-muted-foreground mt-1 flex items-center gap-1 text-sm">
                        <MapPin className="size-3 shrink-0" />
                        <span className="truncate">{selectedProperty.address}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Star className="size-4 fill-amber-500 text-amber-500" />
                      <span className="text-muted-foreground text-sm font-medium">
                        {selectedProperty.rating.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex flex-wrap items-baseline gap-2">
                    {selectedProperty.originalPrice && (
                      <span className="text-muted-foreground text-base line-through sm:text-lg">
                        {formatPrice(selectedProperty.originalPrice)}
                      </span>
                    )}
                    <span className="text-primary text-xl font-bold sm:text-2xl">
                      {formatPrice(selectedProperty.price)}
                    </span>
                    <span className="text-muted-foreground">/{selectedProperty.priceType}</span>
                  </div>
                </div>

                <div className="mb-6 flex flex-wrap gap-2 sm:gap-3">
                  <Badge
                    variant="outline"
                    className="gap-1.5 px-2.5 py-1.5 text-xs font-normal sm:px-3 sm:py-2 sm:text-sm">
                    <Home className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    {selectedProperty.rooms} Rooms
                  </Badge>
                  <Badge
                    variant="outline"
                    className="gap-1.5 px-2.5 py-1.5 text-xs font-normal sm:px-3 sm:py-2 sm:text-sm">
                    <BedDouble className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    {selectedProperty.beds} Beds
                  </Badge>
                  <Badge
                    variant="outline"
                    className="gap-1.5 px-2.5 py-1.5 text-xs font-normal sm:px-3 sm:py-2 sm:text-sm">
                    <Bath className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    {selectedProperty.baths} Baths
                  </Badge>
                </div>

                <div className="mb-6">
                  <h4 className="mb-2 font-semibold">Property Type</h4>
                  <Badge variant="secondary" className="text-sm">
                    {getPropertyTypeLabel(selectedProperty.propertyType)}
                  </Badge>
                </div>

                <div className="mb-6">
                  <h4 className="mb-3 font-semibold">Amenities</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedProperty.amenities.map((amenity) => (
                      <Badge key={amenity} variant="outline" className="font-normal">
                        {amenity}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="mb-6">
                  <h4 className="mb-3 font-semibold">Description</h4>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    This beautiful{" "}
                    {getPropertyTypeLabel(selectedProperty.propertyType).toLowerCase()} is located
                    in {selectedProperty.address}. Featuring {selectedProperty.rooms} spacious
                    rooms, {selectedProperty.beds} comfortable bedrooms, and{" "}
                    {selectedProperty.baths} modern bathrooms. The property comes with excellent
                    amenities including {selectedProperty.amenities.join(", ").toLowerCase()}.
                  </p>
                </div>

                <div className="mb-6">
                  <h4 className="mb-3 font-semibold">Contact Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="text-muted-foreground flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>+62 812 3456 7890</span>
                    </div>
                    <div className="text-muted-foreground flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span>contact@realestate.com</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button className="flex-1">
                    <Calendar className="mr-2 h-4 w-4" />
                    Schedule Visit
                  </Button>
                  <Button variant="outline" className="flex-1">
                    <Phone className="mr-2 h-4 w-4" />
                    Contact Agent
                  </Button>
                </div>
              </div>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}
