"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type TableProps =
  React.ComponentProps<"table"> & {
    containerClassName?: string;
    layout?: "auto" | "fixed";
    minWidth?: number | string;
    variant?: "default" | "register";
  };

function Table({
  className,
  containerClassName,
  layout = "auto",
  minWidth,
  variant = "default",
  style,
  ...props
}: TableProps) {
  return (
    <div
      data-slot="table-container"
      className={cn(
        "relative w-full overflow-x-auto",
        containerClassName,
      )}
    >
      <table
        data-slot="table"
        data-variant={variant}
        className={cn(
          "w-full caption-bottom text-sm",
          layout === "fixed" && "table-fixed",
          variant === "register" && [
            "[&_thead_tr]:h-11",
            "[&_thead_tr]:bg-muted/40",
            "[&_thead_tr]:hover:bg-muted/40",
            "[&_thead_th]:h-11",
            "[&_thead_th]:whitespace-nowrap",
            "[&_thead_th]:px-4",
            "[&_thead_th]:text-start",
            "[&_thead_th]:text-xs",
            "[&_thead_th]:font-semibold",
            "[&_thead_th]:text-muted-foreground",
            "[&_tbody_tr]:h-[62px]",
            "[&_tbody_tr]:hover:bg-muted/35",
            "[&_tbody_td]:h-[62px]",
            "[&_tbody_td]:px-4",
            "[&_tbody_td]:text-start",
            "[&_tbody_td]:align-middle",
          ],
          className,
        )}
        style={{
          ...style,
          ...(minWidth !== undefined
            ? { minWidth }
            : {}),
        }}
        {...props}
      />
    </div>
  );
}

function TableHeader({
  className,
  ...props
}: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn(
        "[&_tr]:border-b",
        className,
      )}
      {...props}
    />
  );
}

function TableBody({
  className,
  ...props
}: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn(
        "[&_tr:last-child]:border-0",
        className,
      )}
      {...props}
    />
  );
}

function TableFooter({
  className,
  ...props
}: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
        className,
      )}
      {...props}
    />
  );
}

type TableRowProps =
  React.ComponentProps<"tr"> & {
    interactive?: boolean;
  };

function TableRow({
  className,
  interactive = false,
  ...props
}: TableRowProps) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "group border-b transition-colors data-[state=selected]:bg-muted/50",
        interactive && "cursor-pointer",
        className,
      )}
      {...props}
    />
  );
}

type TableSticky =
  "start" | "end" | undefined;

type TableAlignment =
  "start" | "center" | "end" | undefined;

function stickyHeadClass(
  sticky: TableSticky,
) {
  if (sticky === "start") {
    return "sticky start-0 z-20 bg-muted/40";
  }

  if (sticky === "end") {
    return "sticky end-0 z-20 bg-muted/40";
  }

  return undefined;
}

function stickyCellClass(
  sticky: TableSticky,
) {
  if (sticky === "start") {
    return "sticky start-0 z-10 bg-background group-hover:bg-muted/35";
  }

  if (sticky === "end") {
    return "sticky end-0 z-10 bg-background group-hover:bg-muted/35";
  }

  return undefined;
}

function alignmentClass(
  contentAlign: TableAlignment,
) {
  if (contentAlign === "center") {
    return "text-center";
  }

  if (contentAlign === "end") {
    return "text-end";
  }

  return "text-start";
}

type TableHeadProps =
  React.ComponentProps<"th"> & {
    sticky?: TableSticky;
    contentAlign?: TableAlignment;
  };

function TableHead({
  className,
  sticky,
  contentAlign = "start",
  ...props
}: TableHeadProps) {
  return (
    <th
      data-slot="table-head"
      data-sticky={sticky}
      className={cn(
        "h-10 whitespace-nowrap px-2 align-middle font-medium text-foreground",
        "[&:has([role=checkbox])]:pe-0",
        "[&>[role=checkbox]]:translate-y-[2px]",
        alignmentClass(contentAlign),
        stickyHeadClass(sticky),
        className,
      )}
      {...props}
    />
  );
}

type TableCellProps =
  React.ComponentProps<"td"> & {
    sticky?: TableSticky;
    contentAlign?: TableAlignment;
  };

function TableCell({
  className,
  sticky,
  contentAlign = "start",
  ...props
}: TableCellProps) {
  return (
    <td
      data-slot="table-cell"
      data-sticky={sticky}
      className={cn(
        "whitespace-nowrap p-2 align-middle",
        "[&:has([role=checkbox])]:pe-0",
        "[&>[role=checkbox]]:translate-y-[2px]",
        alignmentClass(contentAlign),
        stickyCellClass(sticky),
        className,
      )}
      {...props}
    />
  );
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn(
        "mt-4 text-sm text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};
