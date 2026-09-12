"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { cn } from "@/lib/utils"

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto"
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

const TABLE_ROW_INTERACTIVE_SELECTOR = [
  "a",
  "button",
  "input",
  "select",
  "textarea",
  "summary",
  "[role=button]",
  "[role=link]",
  "[role=menuitem]",
  "[role=checkbox]",
  "[role=switch]",
  "[contenteditable=true]",
  "[data-row-navigation-ignore=true]",
].join(",")

function shouldIgnoreTableRowNavigation(
  target: EventTarget | null,
  currentTarget: HTMLTableRowElement,
) {
  if (!(target instanceof Element)) return false

  const interactiveTarget = target.closest(TABLE_ROW_INTERACTIVE_SELECTOR)
  return Boolean(interactiveTarget && interactiveTarget !== currentTarget)
}

function hasActiveTextSelection() {
  if (typeof window === "undefined") return false
  return Boolean(window.getSelection()?.toString().trim())
}

type TableRowProps = React.ComponentProps<"tr"> & {
  href?: string
}

function TableRow({
  className,
  href,
  role,
  tabIndex,
  onClick,
  onKeyDown,
  ...props
}: TableRowProps) {
  const router = useRouter()
  const interactive = Boolean(href)

  function navigate(event: React.MouseEvent<HTMLTableRowElement>) {
    onClick?.(event)

    if (
      event.defaultPrevented ||
      !href ||
      event.button !== 0 ||
      shouldIgnoreTableRowNavigation(event.target, event.currentTarget) ||
      hasActiveTextSelection()
    ) {
      return
    }

    if (event.metaKey || event.ctrlKey || event.shiftKey) {
      window.open(href, "_blank", "noopener,noreferrer")
      return
    }

    router.push(href)
  }

  function navigateByKeyboard(event: React.KeyboardEvent<HTMLTableRowElement>) {
    onKeyDown?.(event)

    if (
      event.defaultPrevented ||
      !href ||
      event.key !== "Enter" ||
      shouldIgnoreTableRowNavigation(event.target, event.currentTarget)
    ) {
      return
    }

    event.preventDefault()
    router.push(href)
  }

  return (
    <tr
      data-slot="table-row"
      data-row-link={interactive ? "true" : undefined}
      role={interactive ? "link" : role}
      tabIndex={interactive ? 0 : tabIndex}
      className={cn(
        "border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted",
        interactive &&
          "cursor-pointer outline-none hover:[&>td]:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset focus-visible:[&>td]:bg-muted/50",
        className
      )}
      onClick={interactive ? navigate : onClick}
      onKeyDown={interactive ? navigateByKeyboard : onKeyDown}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-10 px-2 text-start align-middle font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "px-2 py-3 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
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
}
