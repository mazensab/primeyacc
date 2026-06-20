import React from "react";

import { cn } from "@/lib/utils";

/* =========================================================
   🧩 Types
========================================================= */
interface SectionHeaderProps {
  title: string | React.ReactNode;
  subTitle?: string | React.ReactNode;
  description?: string | React.ReactNode;
  className?: string;
  subTitleClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  dir?: "rtl" | "ltr";
  align?: "center" | "start" | "end";
}

/* =========================================================
   🧩 Section Header
========================================================= */
export default function SectionHeader({
  className,
  subTitleClassName,
  titleClassName,
  descriptionClassName,
  title,
  subTitle,
  description,
  dir,
  align = "center",
}: SectionHeaderProps) {
  const alignmentClass = {
    center: "items-center text-center",
    start: "items-start text-start",
    end: "items-end text-end",
  }[align];

  return (
    <header
      dir={dir}
      className={cn(
        "mx-auto mb-8 flex max-w-3xl flex-col lg:mb-12",
        alignmentClass,
        className
      )}
    >
      {subTitle ? (
        <div
          className={cn(
            "mb-5 inline-flex items-center rounded-full border bg-background/80 px-4 py-2 text-sm font-medium tracking-normal text-foreground shadow-sm backdrop-blur-sm",
            subTitleClassName
          )}
        >
          {subTitle}
        </div>
      ) : null}

      <h2
        className={cn(
          "max-w-4xl text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl md:text-5xl lg:text-6xl",
          titleClassName
        )}
      >
        {title}
      </h2>

      {description ? (
        <p
          className={cn(
            "text-muted-foreground mt-5 max-w-2xl text-base leading-8 sm:text-lg md:mt-6",
            descriptionClassName
          )}
        >
          {description}
        </p>
      ) : null}
    </header>
  );
}