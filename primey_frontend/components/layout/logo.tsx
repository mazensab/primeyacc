import Link from "next/link";
import Image from "next/image";
import React from "react";

import { cn } from "@/lib/utils";

/* =========================================================
   🧩 Types
========================================================= */
type LogoProps = {
  href?: string;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
};

/* =========================================================
   🖼️ Primey Care Logo
========================================================= */
export default function Logo({
  href = "/",
  className,
  imageClassName,
  priority = true,
}: LogoProps) {
  return (
    <Link
      href={href}
      aria-label="Primey Care"
      className={cn(
        "inline-flex items-center rounded-2xl px-2 py-1 transition hover:opacity-85",
        className
      )}
    >
      <Image
        src="/hero logo.png"
        alt="Primey Care"
        width={1200}
        height={420}
        priority={priority}
        unoptimized
        className={cn(
          "h-auto w-auto object-contain",
          "max-w-[120px] sm:max-w-[140px] md:max-w-[160px]",
          imageClassName
        )}
      />
    </Link>
  );
}