import * as React from "react";

import { cn } from "@/lib/utils";

/* =====================================================
   📂 components/ui/card.tsx
   🧩 Mhamcloud — Premium Card
   -----------------------------------------------------
   ✅ Keeps the existing Card API without breaking pages.
   ✅ Uses Mhamcloud black/neutral accents instead of PrimeyCare purple.
   ✅ Keeps a clean white premium workspace surface.
   ✅ Supports dark mode with neutral black/gray shadows.
===================================================== */

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        [
          "relative isolate flex flex-col gap-6 overflow-hidden rounded-3xl border py-6",
          "border-primary/15 bg-gradient-to-br from-white via-primary/[0.018] to-primary/[0.045]",
          "text-card-foreground shadow-[0_16px_40px_rgba(17,24,39,0.075)]",
          "backdrop-blur-xl transition-all duration-200",
          "before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:content-['']",
          "before:bg-[radial-gradient(circle_at_top_right,rgba(17,24,39,0.055),transparent_36%),linear-gradient(135deg,rgba(255,255,255,0.94),rgba(255,255,255,0.68),rgba(17,24,39,0.025))]",
          "after:pointer-events-none after:absolute after:inset-0 after:-z-10 after:content-['']",
          "after:bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(255,255,255,0.18))]",
          "hover:border-primary/25 hover:shadow-[0_18px_48px_rgba(17,24,39,0.095)]",
          "dark:border-white/10 dark:bg-gradient-to-br dark:from-white/[0.075] dark:via-primary/[0.10] dark:to-white/[0.025]",
          "dark:text-card-foreground dark:shadow-[0_18px_48px_rgba(0,0,0,0.30)]",
          "dark:before:bg-[radial-gradient(circle_at_top_right,rgba(249,250,251,0.10),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.035),rgba(249,250,251,0.045))]",
          "dark:after:bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.015))]",
        ].join(" "),
        className
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};