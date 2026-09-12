import * as React from "react"

import { cn } from "@/lib/utils"

const LATIN_NUMERIC_INPUT_TYPES = new Set([
  "number",
  "date",
  "time",
  "datetime-local",
  "month",
  "week",
  "tel",
])

const LATIN_NUMERIC_INPUT_MODES = new Set([
  "numeric",
  "decimal",
  "tel",
])

function normalizeLatinDigits(value: string) {
  return value
    .replace(/[\u0660-\u0669]/g, (digit) =>
      String("\u0660\u0661\u0662\u0663\u0664\u0665\u0666\u0667\u0668\u0669".indexOf(digit)),
    )
    .replace(/[\u06F0-\u06F9]/g, (digit) =>
      String("\u06F0\u06F1\u06F2\u06F3\u06F4\u06F5\u06F6\u06F7\u06F8\u06F9".indexOf(digit)),
    )
}

function normalizeLatinNumericText(value: string, decimalMode: boolean) {
  let normalized = normalizeLatinDigits(value)

  if (decimalMode) {
    normalized = normalized.replace(/\u066B/g, ".").replace(/\u066C/g, "")
  }

  return normalized
}

function Input({
  className,
  type,
  lang,
  dir,
  inputMode,
  value,
  defaultValue,
  onChange,
  ...props
}: React.ComponentProps<"input">) {
  const requestedType = String(type || "").toLowerCase()
  const requestedInputMode = String(inputMode || "").toLowerCase()
  const numberAsText = requestedType === "number"
  const forceLatinNumeric =
    LATIN_NUMERIC_INPUT_TYPES.has(requestedType) ||
    LATIN_NUMERIC_INPUT_MODES.has(requestedInputMode)

  const resolvedType = numberAsText ? "text" : type
  const resolvedInputMode =
    numberAsText ? (inputMode || "decimal") : inputMode
  const decimalMode =
    numberAsText || String(resolvedInputMode || "").toLowerCase() === "decimal"

  const normalizedValue =
    forceLatinNumeric && typeof value === "string"
      ? normalizeLatinNumericText(value, decimalMode)
      : value

  const normalizedDefaultValue =
    forceLatinNumeric && typeof defaultValue === "string"
      ? normalizeLatinNumericText(defaultValue, decimalMode)
      : defaultValue

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    if (forceLatinNumeric) {
      const normalized = normalizeLatinNumericText(
        event.currentTarget.value,
        decimalMode,
      )

      if (event.currentTarget.value !== normalized) {
        event.currentTarget.value = normalized
      }
    }

    onChange?.(event)
  }
  return (
    <input
      type={resolvedType}
      lang={forceLatinNumeric ? "en" : lang}
      dir={forceLatinNumeric ? "ltr" : dir}
      inputMode={resolvedInputMode}
      value={normalizedValue}
      defaultValue={normalizedDefaultValue}
      onChange={handleChange}
      data-latin-numeric={forceLatinNumeric ? "true" : undefined}
      data-native-number-replaced={numberAsText ? "true" : undefined}
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
