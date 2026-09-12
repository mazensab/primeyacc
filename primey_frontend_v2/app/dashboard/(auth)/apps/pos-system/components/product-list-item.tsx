"use client";

import React from "react";
import { PlusIcon, ShoppingCartIcon } from "lucide-react";

import { Product, useStore } from "../store";

import { toast } from "sonner";

export default function ProductListItem({ product }: { product: Product }) {
  const { addToCart } = useStore();

  const [productQuantities, setProductQuantities] = React.useState<Record<string, number>>({});

  const getProductQuantity = (productId: string) => {
    return productQuantities[productId] || 1;
  };

  const handleAddToCart = (product: Product) => {
    const quantity = getProductQuantity(product.id);
    addToCart(product, quantity);

    // Reset quantity after adding
    setProductQuantities((prev) => ({
      ...prev,
      [product.id]: 1
    }));
    toast.success("Product added to cart.");
  };

  return (
    <div
      className="group bg-card flex cursor-pointer flex-col overflow-hidden rounded-xl border transition-shadow hover:shadow-md"
      onClick={() => handleAddToCart(product)}>
      <div className="relative aspect-4/3 overflow-hidden">
        <img
          src={product.image || "/placeholder.svg"}
          alt={product.name}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="flex items-center justify-between gap-2 p-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">{product.name}</h3>
          <p className="text-muted-foreground text-sm tabular-nums">${product.price.toFixed(2)}</p>
        </div>
        <span className="text-muted-foreground group-hover:text-foreground relative me-1 shrink-0 transition-colors">
          <ShoppingCartIcon className="size-4" />
          <PlusIcon
            className="bg-card absolute -top-1 -end-1.5 size-2.5 rounded-full"
            strokeWidth={3.5}
          />
        </span>
      </div>
    </div>
  );
}
