"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DataRegisterTableFrameProps = {
  children: React.ReactNode;
  className?: string;
};

export function DataRegisterTableFrame({
  children,
  className,
}: DataRegisterTableFrameProps) {
  return (
    <div
      data-slot="data-register-table-frame"
      className={cn(
        "overflow-hidden rounded-lg border bg-background !shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

type DataRegisterResultCountProps = {
  showingLabel: string;
  showingCount: number | string;
  ofLabel: string;
  totalCount: number | string;
  rowsLabel: string;
  className?: string;
};

export function DataRegisterResultCount({
  showingLabel,
  showingCount,
  ofLabel,
  totalCount,
  rowsLabel,
  className,
}: DataRegisterResultCountProps) {
  return (
    <div
      data-slot="data-register-result-count"
      className={cn(
        "text-sm text-muted-foreground",
        className,
      )}
    >
      {showingLabel}{" "}
      <span
        dir="ltr"
        lang="en"
        className="font-medium text-foreground tabular-nums"
      >
        {showingCount}
      </span>{" "}
      {ofLabel}{" "}
      <span
        dir="ltr"
        lang="en"
        className="font-medium text-foreground tabular-nums"
      >
        {totalCount}
      </span>{" "}
      {rowsLabel}
    </div>
  );
}

type DataRegisterPreviewLinkProps = {
  href: string;
  label: string;
  icon: LucideIcon;
  className?: string;
};

export function DataRegisterPreviewLink({
  href,
  label,
  icon: Icon,
  className,
}: DataRegisterPreviewLinkProps) {
  return (
    <div
      data-slot="data-register-preview-footer"
      className={cn(
        "flex justify-end border-t pt-3 rtl:justify-start",
        className,
      )}
    >
      <Button
        asChild
        type="button"
        variant="ghost"
        size="sm"
        className="h-9 gap-2 px-2.5 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
      >
        <Link href={href}>
          <Icon className="h-4 w-4 text-[#a57b3d]" />
          <span>{label}</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </Button>
    </div>
  );
}
