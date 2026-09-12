import { generateMeta } from "@/lib/utils";
import PosSystemTableRender from "./tables-render";
import { Table, TableCategory } from "../store";
import tableCategoriesData from "../data/table-categories.json";
import tablesData from "../data/tables.json";

export async function generateMetadata() {
  return generateMeta({
    title: "POS System App",
    description:
      "Product and order management application template for restaurants or online businesses. Built with shadcn/ui, Next.js and Tailwind CSS.",
    canonical: "/apps/ai-chat"
  });
}

export default function Page() {
  return <PosSystemTableRender tableCategories={tableCategoriesData as unknown as TableCategory[]} tables={tablesData as unknown as Table[]} />;
}
