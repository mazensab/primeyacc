import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Heart,
  Phone,
  Share2,
  EyeOff,
  MapPin,
  BedDouble,
  Bath,
  Ruler,
  Mail,
  ChevronLeft,
  Pencil
} from "lucide-react";
import { generateMeta } from "@/lib/utils";
import type { ListingData } from "../types";
import { MarketValueSection } from "./components/market-value-section";
import { ExpandableDescription } from "./components/expandable-description";
import { PhotoGalleryDialog } from "./components/photo-gallery-dialog";
import { AgentContactForm } from "./components/agent-contact-form";
import data from "../data.json";

export async function generateMetadata(): Promise<Metadata> {
  return generateMeta({
    title: "Real Estate Detail",
    additionalTitle: true,
    description:
      "View property details, photo galleries, and listing analytics. A professional real estate admin page built with React, TypeScript, Tailwind CSS, and shadcn/ui.",
    canonical: "/real-estate/detail"
  });
}

const infoItems = (listing: ListingData["listing"]) => [
  { label: "Property type", value: listing.propertyType },
  { label: "Price per sqft", value: listing.pricePerSqft },
  { label: "Floorplan", value: listing.floorplan },
  { label: "Builder", value: listing.builder },
  { label: "Garage", value: listing.garage },
  { label: "Areas", value: listing.area }
];

export default function Page() {
  const detail = data.detail;
  const [mainImage, ...subImages] = detail.gallery;

  return (
    <div className="mx-auto max-w-5xl space-y-4 lg:space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon">
            <ChevronLeft />
          </Button>
          <Breadcrumb>
            <BreadcrumbList>
              {detail.breadcrumbs.map((item, index) => {
                const isLast = index === detail.breadcrumbs.length - 1;

                return (
                  <div className="inline-flex items-center gap-1.5" key={item}>
                    <BreadcrumbItem>
                      {isLast ? (
                        <BreadcrumbPage>{item}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild>
                          <Link href="#">{item}</Link>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                    {!isLast && <BreadcrumbSeparator />}
                  </div>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
          <Button variant="outline" size="sm" type="button">
            <Pencil />
            Edit
          </Button>
          <Button variant="outline" size="sm" type="button">
            <Share2 />
            Share
          </Button>
          <Button variant="outline" size="sm" type="button">
            <EyeOff />
            Hide
          </Button>
          <Button variant="outline" size="icon-sm" type="button">
            <Heart />
          </Button>
        </div>
      </div>

      <section className="grid gap-3 lg:grid-cols-3">
        <div className="relative min-h-[250px] overflow-hidden rounded-md lg:col-span-2 lg:min-h-[420px]">
          <img src={mainImage.url} alt={mainImage.alt} className="absolute inset-0 h-full w-full object-cover" />
        </div>

        <div className="grid gap-3 grid-cols-2">
          {subImages.map((image, index) => (
            <div
              className="relative min-h-[200px] overflow-hidden rounded-md lg:min-h-[200px]"
              key={image.url}>
              <img src={image.url} alt={image.alt} className="absolute inset-0 h-full w-full object-cover" />
              {index === subImages.length - 1 && (
                <div className="absolute right-3 bottom-3">
                  <PhotoGalleryDialog images={detail.gallery} />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Badge variant="secondary">{detail.listing.status}</Badge>
              <div className="flex flex-col justify-between space-y-4 lg:flex-row lg:items-center lg:space-y-0">
                <div className="space-y-1">
                  <p className="text-3xl font-bold">{detail.listing.price}</p>
                  <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
                    <MapPin className="size-3" />
                    {detail.listing.address}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm *:space-y-1 *:rounded-md *:border *:p-3 *:text-center">
                  <div>
                    <p className="text-2xl font-semibold">{detail.listing.beds}</p>
                    <p className="text-muted-foreground inline-flex items-center gap-1">
                      <BedDouble className="size-4" />
                      beds
                    </p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold">{detail.listing.baths}</p>
                    <p className="text-muted-foreground inline-flex items-center gap-1">
                      <Bath className="size-4" />
                      baths
                    </p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold">{detail.listing.sqft}</p>
                    <p className="text-muted-foreground inline-flex items-center gap-1">
                      <Ruler className="size-4" />
                      Sqft
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm">
                <p>
                  Est. <span className="font-semibold">{detail.listing.estimate}</span>
                </p>
                <Button size="sm">Get pre-qualified</Button>
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 lg:gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {infoItems(detail.listing).map((item) => (
                <div className="space-y-1" key={item.label}>
                  <p className="text-muted-foreground text-sm">{item.label}</p>
                  <p className="font-medium">{item.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Listing Agent</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xl font-semibold">{detail.agent.name}</p>
            <div className="space-y-2 text-sm">
              <p className="inline-flex items-center gap-2">
                <Phone className="text-muted-foreground size-4" />
                {detail.agent.phone}
              </p>
              <p className="inline-flex items-center gap-2">
                <Mail className="text-muted-foreground size-4" />
                {detail.agent.email}
              </p>
            </div>
            <AgentContactForm agent={detail.agent} />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:gap-6 lg:grid-cols-[280px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>What&apos;s special</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {detail.specials.map((item) => (
                <Badge variant="outline" key={item}>
                  {item}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <ExpandableDescription text={detail.description} />
          </CardContent>
        </Card>
      </section>

      <MarketValueSection marketValue={detail.marketValue} />
    </div>
  );
}
