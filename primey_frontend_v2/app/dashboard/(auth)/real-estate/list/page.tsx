import { PropertyTable } from "./components/property-table";
import { Metadata } from "next";
import { generateMeta } from "@/lib/utils";
import data from "../data.json";

export async function generateMetadata(): Promise<Metadata> {
  return generateMeta({
    title: "Real Estate Property List",
    additionalTitle: true,
    description:
      "Manage real estate inventory with advanced filtering and sorting. A professional property list page built with React, TypeScript, Tailwind CSS, shadcn/ui, and Tanstack Table.",
    canonical: "/real-estate/list"
  });
}

export default function Page() {
  return <PropertyTable items={data.properties} />;
}
