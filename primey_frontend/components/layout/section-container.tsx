import React from "react";

import { cn } from "@/lib/utils";

/* =========================================================
   🧩 Types
========================================================= */
type SectionContainerProps = {
  id?: string;
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
  dir?: "rtl" | "ltr";
};

/* =========================================================
   🧱 Section Container
========================================================= */
export default function SectionContainer({
  id,
  children,
  className,
  containerClassName,
  dir,
}: SectionContainerProps) {
  return (
    <section
      id={id}
      dir={dir}
      className={cn(
        "relative scroll-mt-28 py-16 md:py-20 lg:py-24",
        className
      )}
    >
      <div className={cn("container", containerClassName)}>{children}</div>
    </section>
  );
}