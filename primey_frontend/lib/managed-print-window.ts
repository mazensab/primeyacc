"use client";

/**
 * Primey / Mhamcloud centralized browser print-window lifecycle.
 *
 * Report builders stay responsible for their document/table bodies while
 * popup creation, document writing, focus, delayed printing, and close
 * behavior are handled from one shared place.
 */
export function openManagedPrintWindow(
  url = "",
  target = "_blank",
  features = "width=1400,height=900",
): Window | null {
  if (typeof window === "undefined") {
    return null;
  }

  const popup = window.open(url, target, features);

  if (popup) {
    popup.opener = null;
  }

  return popup;
}

export function openManagedPrintUrl(
  url: string,
  target = "_blank",
  features = "width=1400,height=900",
): Window | null {
  return openManagedPrintWindow(url, target, features);
}

export function writeManagedPrintDocument(
  target: Window,
  html: string,
): void {
  target.document.write(html);
}

export function writeAutoManagedPrintDocument(
  target: Window,
  html: string,
): void {
  const shouldAutoPrint = html.includes(
    "window.__PRIMEY_PRINT_READY__ = true",
  );

  target.document.write(html);

  if (shouldAutoPrint) {
    printManagedWindow(target, 350);
  }
}

export function printManagedWindow(
  target: Window,
  delay = 0,
): void {
  const execute = () => {
    target.focus();
    target.print();
  };

  if (delay > 0) {
    window.setTimeout(execute, delay);
    return;
  }

  execute();
}

export function printCurrentPage(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.print();
}
