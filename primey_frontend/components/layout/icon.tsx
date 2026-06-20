"use client";

import type React from "react";
import { icons } from "lucide-react";

/* =========================================================
   🧩 Types
========================================================= */
type IconProps = {
  name: string;
  className?: string;
  strokeWidth?: number;
  fallback?: React.ReactNode;
  "aria-label"?: string;
};

type IconType = React.ComponentType<React.SVGProps<SVGSVGElement>>;

type IconsType = Record<string, IconType>;

/* =========================================================
   🎯 Icon Map
========================================================= */
const iconMap = icons as IconsType;

/* =========================================================
   🧩 Dynamic Lucide Icon
========================================================= */
const Icon: React.FC<IconProps> = ({
  name,
  className,
  strokeWidth = 2,
  fallback = null,
  "aria-label": ariaLabel,
}) => {
  const LucideIcon = iconMap[name];

  if (!LucideIcon) {
    return <>{fallback}</>;
  }

  return (
    <LucideIcon
      className={className}
      strokeWidth={strokeWidth}
      aria-hidden={ariaLabel ? undefined : true}
      aria-label={ariaLabel}
      focusable="false"
    />
  );
};

export default Icon;