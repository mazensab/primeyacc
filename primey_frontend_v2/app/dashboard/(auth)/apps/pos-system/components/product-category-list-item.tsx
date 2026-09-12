import { ProductCategory } from "../store";
import { RadioGroupItem } from "@/components/ui/radio-group";

type ProductCategoryListItem = {
  category: ProductCategory;
};

export default function ProductCategoryListItem({ category }: ProductCategoryListItem) {
  return (
    <div
      key={category.id}
      className="has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/5 has-focus-visible:border-ring has-focus-visible:ring-ring/50 hover:bg-muted/50 bg-card relative flex aspect-square w-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border p-2 text-center outline-none transition-colors lg:w-28">
      <RadioGroupItem id={`c-${category.id}`} value={category.id.toString()} className="absolute sr-only" />
      <span className="flex h-8 items-center justify-center text-2xl leading-none lg:h-9 lg:text-3xl">
        {category.icon}
      </span>
      <label
        htmlFor={`c-${category.id}`}
        className="text-foreground w-full cursor-pointer truncate text-sm leading-none font-medium after:absolute after:inset-0">
        {category.name}
      </label>
    </div>
  );
}
