"use client";

import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

/* =========================================================
   🧩 Types
========================================================= */
type LogoIconProps = {
  href?: string;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
};

/* =========================================================
   🖼️ Primey Care Logo Icon
========================================================= */
export default function LogoIcon({
  href = "/",
  className,
  imageClassName,
  priority = true,
}: LogoIconProps) {
  return (
    <Link
      href={href}
      aria-label="Primey Care"
      className={cn(
        "inline-flex items-center justify-center rounded-2xl transition hover:opacity-85",
        className
      )}
    >
      <Image
        src="/logo/primey-icon.ico"
        alt="Primey Care"
        width={40}
        height={40}
        priority={priority}
        className={cn("h-10 w-10 rounded-xl object-cover", imageClassName)}
      />
    </Link>
  );
}