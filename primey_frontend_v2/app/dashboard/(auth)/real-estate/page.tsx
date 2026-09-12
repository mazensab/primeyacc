import { Users, DollarSign, Building2, CheckCircle } from "lucide-react";

import { Metadata } from "next";
import { generateMeta } from "@/lib/utils";

import CustomDateRangePicker from "@/components/custom-date-range-picker";
import { Button } from "@/components/ui/button";

import { StatCard } from "./components/stat-card";
import { PerformanceChart } from "./components/performance-chart";
import { FeaturedProperty } from "./components/featured-property";
import { DealsProgress } from "./components/deals-progress";
import { ReminderCard } from "./components/reminder-card";
import { CalendarWidget } from "./components/calendar-widget";
import { ActiveListingTable } from "./components/active-listing-table";
import { LeadsContact } from "./components/leads-contact";
import { SalesAnalyticsCard } from "./components/sales-analytics-card";
import { PropertyOverviewCard } from "./components/property-overview-card";

import data from "./data.json";
import type { ActiveListingRow, FeaturedPropertyItem, RealEstateProperty } from "./types";

export async function generateMetadata(): Promise<Metadata> {
  return generateMeta({
    title: "Real Estate Admin Dashboard",
    description:
      "Manage property listings, sales analytics, and lead tracking. A professional real estate admin page built with React, TypeScript, Tailwind CSS, and shadcn/ui.",
    canonical: "/real-estate"
  });
}

const iconMap = {
  users: <Users className="text-primary size-4" />,
  "dollar-sign": <DollarSign className="text-warning size-4" />,
  "building-2": <Building2 className="text-success size-4" />,
  "check-circle": <CheckCircle className="text-warning size-4" />
} as const;

const dashboardData = data.dashboard;

function isActiveProperty(property: RealEstateProperty): property is RealEstateProperty & {
  isActive: true;
  type: string;
  units: number;
  cost: string;
  leads: { count: number; avatars: string[] };
  views: number;
  listingStatus: "Occupied" | "Available" | "Sold Out";
} {
  return property.isActive === true;
}

function isFeaturedProperty(property: RealEstateProperty): property is RealEstateProperty & {
  isFeatured: true;
  type: string;
  featuredSold: number;
  featuredRented: number;
  featuredViews: string;
  featuredLeads: number;
} {
  return property.isFeatured === true;
}

function toActiveListingTableRows(properties: readonly RealEstateProperty[]): ActiveListingRow[] {
  return properties.filter(isActiveProperty).map((property) => ({
    id: property.id,
    property: property.name,
    location: property.address,
    image: property.thumbnailImage,
    type: property.type,
    units: property.units,
    cost: property.cost,
    leads: property.leads,
    views: property.views,
    status: property.listingStatus
  }));
}

function toFeaturedPropertyItem(
  properties: readonly RealEstateProperty[]
): FeaturedPropertyItem | null {
  const featuredProperty = properties.find(isFeaturedProperty);
  if (!featuredProperty) return null;

  return {
    name: featuredProperty.name,
    type: featuredProperty.type,
    image: featuredProperty.image,
    sold: featuredProperty.featuredSold,
    rented: featuredProperty.featuredRented,
    views: featuredProperty.featuredViews,
    leads: featuredProperty.featuredLeads
  };
}

const activeListingRows = toActiveListingTableRows(data.properties);
const featuredProperty = toFeaturedPropertyItem(data.properties);

export default function Page() {
  return (
    <div className="gap-4 lg:gap-6 space-y-4 lg:space-y-6">
      <div className="flex flex-row items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight lg:text-2xl">Real Estate Dashboard</h1>
        <div className="flex items-center space-x-2">
          <CustomDateRangePicker />
          <Button>Download</Button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {dashboardData.stats.map((stat, index) => (
          <StatCard
            key={index}
            item={{ ...stat, icon: iconMap[stat.icon as keyof typeof iconMap] }}
          />
        ))}
      </div>

      <div className="gap-4 lg:gap-6 space-y-4 lg:grid lg:space-y-0 2xl:grid-cols-3">
        <PerformanceChart />
        <div className="space-y-4 lg:space-y-6">
          {featuredProperty ? <FeaturedProperty item={featuredProperty} /> : null}
          <DealsProgress />
        </div>
        <ReminderCard items={dashboardData.reminders} />
      </div>

      <div className="grid gap-4 lg:gap-6 xl:grid-cols-4">
        <LeadsContact items={dashboardData.leads} />
        <div className="h-full xl:col-span-2">
          <SalesAnalyticsCard />
        </div>
        <PropertyOverviewCard />
      </div>

      <div className="gap-4 lg:gap-6 space-y-4 md:grid lg:grid-cols-2 lg:space-y-0">
        <ActiveListingTable items={activeListingRows} />
        <CalendarWidget />
      </div>
    </div>
  );
}
