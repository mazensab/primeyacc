import { generateMeta } from "@/lib/utils";
import { PropertyListing } from "./components/property-listing";
import { Metadata } from "next";
import data from "../data.json";

export async function generateMetadata(): Promise<Metadata> {
  return generateMeta({
    title: "Real Estate Filter",
    additionalTitle: true,
    description:
      "Advanced real estate filtering with type-safe search and dynamic categories. A professional page built with React, TypeScript, Tailwind CSS, and shadcn/ui.",
    canonical: "/real-estate/filter"
  });
}

export default function Page() {
  return <PropertyListing properties={data.properties} />;
}
