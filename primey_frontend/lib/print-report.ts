"use client";

import {
  openManagedPrintWindow,
  printManagedWindow,
  writeManagedPrintDocument,
} from "@/lib/managed-print-window";

export type PrintReportLocale = "ar" | "en";

export type PrintReportOptions = {
  locale: PrintReportLocale;
  title: string;
  subtitle?: string;
  branchName?: string;
  tableHtml: string;
  recordsCount?: number;
  recordsLabel?: string;
  generatedAtLabel?: string;
  logoUrl?: string;
};

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatReportDateTime(value = new Date()) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

export function buildPrintReportDocument({
  locale,
  title,
  subtitle = "",
  branchName = "",
  tableHtml,
  recordsCount,
  recordsLabel,
  generatedAtLabel,
  logoUrl,
}: PrintReportOptions) {
  const dir = locale === "ar" ? "rtl" : "ltr";
  const generatedLabel =
    generatedAtLabel || (locale === "ar" ? "تم الإنشاء في" : "Generated at");
  const countLabel =
    recordsLabel || (locale === "ar" ? "سجل" : "records");

  return `<!doctype html>
<html lang="${locale}" dir="${dir}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      * { box-sizing: border-box; }
      html, body { width: 100%; margin: 0; background: #fff; }
      body {
        color: #111827;
        font-family: Tahoma, Arial, sans-serif;
        font-size: 11px;
        padding: 0;
      }
      .report-sheet { width: 100%; margin: 0 auto; }
      .report-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 20px;
        margin-bottom: 12px;
        padding-bottom: 10px;
        border-bottom: 2px solid #c58a1c;
      }
      .report-brand {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        min-width: 0;
      }
      .report-logo {
        width: 46px;
        height: 46px;
        object-fit: contain;
        flex: 0 0 auto;
      }
      h1 {
        margin: 0;
        font-size: 22px;
        line-height: 1.3;
      }
      .subtitle {
        margin: 5px 0 0;
        color: #4b5563;
        font-size: 10.5px;
        line-height: 1.6;
      }
      .meta {
        flex: 0 0 auto;
        color: #4b5563;
        font-size: 9.5px;
        line-height: 1.8;
        text-align: end;
      }
      .report-section {
        width: 100%;
        break-inside: avoid;
        page-break-inside: avoid;
      }
      .report-section + .report-section { margin-top: 18px; }
      h2 {
        margin: 0 0 8px;
        padding-inline-start: 9px;
        border-inline-start: 3px solid #c58a1c;
        color: #a96f0c;
        font-size: 14px;
        font-weight: 800;
        line-height: 1.4;
      }
      table.data {
        width: 100%;
        border-collapse: collapse;
        table-layout: auto;
      }
      table.data th,
      table.data td {
        border: 1px solid #111827;
        padding: 7px 8px;
        text-align: start;
        vertical-align: middle;
        overflow-wrap: anywhere;
        line-height: 1.35;
      }
      table.data th {
        background: #f2f4f7;
        color: #344054;
        font-size: 10px;
        font-weight: 800;
      }
      table.data td {
        font-size: 10px;
        color: #344054;
      }
      table.data tbody tr:nth-child(even) td {
        background: #fcfcfb;
      }
      .text,
      .number {
        font-variant-numeric: tabular-nums;
      }
      .number {
        direction: ltr;
        unicode-bidi: plaintext;
        white-space: nowrap;
        text-align: end;
      }
      @page {
        size: A4 landscape;
        margin: 10mm;
      }
      @media print {
        html, body, .report-sheet {
          width: 100% !important;
          max-width: none !important;
        }
        body {
          padding: 0 !important;
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
        }
        thead { display: table-header-group; }
        tr {
          break-inside: avoid;
          page-break-inside: avoid;
        }
      }
    </style>
  </head>
  <body>
    <main class="report-sheet">
      <header class="report-header">
        <div class="report-brand">
          ${
            logoUrl
              ? `<img class="report-logo" src="${escapeHtml(logoUrl)}" alt="" />`
              : ""
          }
          <div>
            <h1>${escapeHtml(title)}</h1>
            ${subtitle ? `<p class="subtitle">${escapeHtml(subtitle)}</p>` : ""}
            ${branchName ? `<p class="subtitle">${escapeHtml(branchName)}</p>` : ""}
          </div>
        </div>
        <div class="meta">
          <div>${escapeHtml(generatedLabel)}: <span dir="ltr">${escapeHtml(formatReportDateTime())}</span></div>
          ${
            typeof recordsCount === "number"
              ? `<div>${escapeHtml(countLabel)}: <span dir="ltr">${escapeHtml(recordsCount)}</span></div>`
              : ""
          }
        </div>
      </header>
      ${tableHtml}
    </main>
  </body>
</html>`;
}

export function openPrintReport(options: PrintReportOptions): boolean {
  const printWindow = openManagedPrintWindow(
    "",
    "_blank",
    "width=1400,height=900",
  );

  if (!printWindow) {
    return false;
  }

  printWindow.opener = null;
  printWindow.document.open();
  writeManagedPrintDocument(
    printWindow,
    buildPrintReportDocument(options),
  );
  printWindow.document.close();
  printWindow.onafterprint = () => {
    printWindow.close();
  };

  printManagedWindow(printWindow, 250);
  return true;
}

export function openPrintHtmlReport(html: string): boolean {
  const printWindow = window.open(
    "",
    "_blank",
    "noopener,noreferrer,width=1400,height=900",
  );

  if (!printWindow) return false;

  printWindow.opener = null;
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  const runPrint = () => {
    printWindow.focus();
    printWindow.print();
  };

  if (printWindow.document.readyState === "complete") {
    window.setTimeout(runPrint, 50);
  } else {
    printWindow.onload = runPrint;
  }

  return true;
}
