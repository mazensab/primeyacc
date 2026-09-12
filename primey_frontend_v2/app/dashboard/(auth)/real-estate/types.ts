import data from "./data.json";

export type RealEstateProperty = (typeof data.properties)[number];

type DashboardListingFields = Pick<
  RealEstateProperty,
  "type" | "units" | "cost" | "leads" | "views" | "listingStatus"
>;

type ActivePropertyForRow = RealEstateProperty &
  Required<DashboardListingFields> & {
    isActive: true;
  };

export type ActiveListingRow = Pick<
  ActivePropertyForRow,
  "id" | "type" | "units" | "cost" | "leads" | "views"
> & {
  property: ActivePropertyForRow["name"];
  location: ActivePropertyForRow["address"];
  image: ActivePropertyForRow["thumbnailImage"];
  status: ActivePropertyForRow["listingStatus"];
};

type FeaturedPropertyFields = Pick<
  RealEstateProperty,
  "type" | "featuredSold" | "featuredRented" | "featuredViews" | "featuredLeads"
>;

type FeaturedPropertySource = RealEstateProperty &
  Required<FeaturedPropertyFields> & {
    isFeatured: true;
  };

export type FeaturedPropertyItem = {
  name: FeaturedPropertySource["name"];
  type: FeaturedPropertySource["type"];
  image: FeaturedPropertySource["image"];
  sold: FeaturedPropertySource["featuredSold"];
  rented: FeaturedPropertySource["featuredRented"];
  views: FeaturedPropertySource["featuredViews"];
  leads: FeaturedPropertySource["featuredLeads"];
};

export type ListingData = typeof data.detail;
export type ListingAgent = ListingData["agent"];

