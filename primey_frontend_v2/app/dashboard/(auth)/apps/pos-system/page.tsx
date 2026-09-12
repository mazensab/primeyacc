import { generateMeta } from "@/lib/utils";

import PosSystemMenu from "./components/pos-system-menu";
import { Table, TableCategory, Product, ProductCategory } from "./store";
import productCategoriesData from "./data/product-categories.json";
import productsData from "./data/products.json";
import tableCategoriesData from "./data/table-categories.json";
import tablesData from "./data/tables.json";

export async function generateMetadata() {
  return generateMeta({
    title: "POS System App",
    additionalTitle: true,
    description:
      "Manage table reservations, product orders, and checkout processes with a real-time status tracker and integrated payment options. A professional POS system application built with React, TypeScript, Tailwind CSS, and shadcn/ui.",
    canonical: "/apps/pos-system-app"
  });
}

export default function Page() {
  return (
    <PosSystemMenu
      productCategories={productCategoriesData as unknown as ProductCategory[]}
      products={productsData as unknown as Product[]}
      tables={tablesData as unknown as Table[]}
      tableCategories={tableCategoriesData as unknown as TableCategory[]}
    />
  );
}
