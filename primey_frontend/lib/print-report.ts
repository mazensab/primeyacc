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

export type PrintReportCellValue = string | number | null | undefined;

export type PrintReportTableColumn = {
  label: string;
  width?: number;
  type?: "text" | "number" | "money";
};

export type PrintReportTableSection = {
  title?: string;
  columns: PrintReportTableColumn[];
  rows: PrintReportCellValue[][];
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

function formatPrintNumber(value: PrintReportCellValue) {
  if (value === null || value === undefined || value === "") return "?";

  if (typeof value === "number" && Number.isFinite(value)) {
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 20,
    }).format(value);
  }

  return String(value);
}

function formatPrintMoney(value: PrintReportCellValue) {
  if (value === null || value === undefined || value === "") return "?";

  const numeric =
    typeof value === "number"
      ? value
      : Number(String(value).replace(/,/g, ""));

  if (!Number.isFinite(numeric)) return String(value);

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric);
}

export function buildPrintReportTableHtml(
  sections: PrintReportTableSection[],
): string {
  return sections
    .filter(
      (section) =>
        section.columns.length > 0 &&
        section.rows.length > 0,
    )
    .map((section) => {
      const colgroup = section.columns
        .map((column) =>
          typeof column.width === "number" && column.width > 0
            ? `<col style="width:${column.width}px" />`
            : "<col />",
        )
        .join("");

      const headers = section.columns
        .map((column) => `<th>${escapeHtml(column.label)}</th>`)
        .join("");

      const rows = section.rows
        .map(
          (row) =>
            `<tr>${section.columns
              .map((column, index) => {
                const value = row[index];
                const type = column.type || "text";
                const rendered =
                  type === "money"
                    ? formatPrintMoney(value)
                    : type === "number"
                      ? formatPrintNumber(value)
                      : String(value ?? "?");
                const className =
                  type === "money" || type === "number"
                    ? "number"
                    : "text";

                return `<td class="${className}">${escapeHtml(rendered)}</td>`;
              })
              .join("")}</tr>`,
        )
        .join("");

      return `
        <section class="report-section">
          ${section.title ? `<h2>${escapeHtml(section.title)}</h2>` : ""}
          <table class="data">
            <colgroup>${colgroup}</colgroup>
            <thead><tr>${headers}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </section>`;
    })
    .join("");
}

export function openPrintTableReport(
  options: Omit<PrintReportOptions, "tableHtml"> & {
    sections: PrintReportTableSection[];
  },
): boolean {
  const { sections, ...reportOptions } = options;

  return openPrintReport({
    ...reportOptions,
    tableHtml: buildPrintReportTableHtml(sections),
  });
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
        border-bottom: 1px solid #d7dce3;
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
        color: #101828;
        font-size: 20px;
        line-height: 1.35;
        font-weight: 800;
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
        break-inside: auto;
        page-break-inside: auto;
      }
      .report-section + .report-section { margin-top: 18px; }
      h2 {
        margin: 0 0 8px;
        padding-inline-start: 9px;
        border-inline-start: 3px solid #a57b3d;
        color: #101828;
        font-size: 14px;
        font-weight: 800;
        line-height: 1.4;
      }
      table {
        width: 100%;
        margin-top: 4px;
        border-collapse: separate;
        border-spacing: 0;
        table-layout: fixed;
        overflow: hidden;
        border: 1px solid #d7dce3;
        border-radius: 8px;
      }
      table th,
      table td {
        border: 0;
        border-inline-end: 1px solid #e2e6eb;
        border-bottom: 1px solid #e2e6eb;
        padding: 5px 7px;
        text-align: start;
        vertical-align: middle;
        overflow-wrap: anywhere;
        line-height: 1.45;
      }
      table th:last-child,
      table td:last-child {
        border-inline-end: 0;
      }
      table tbody tr:last-child td {
        border-bottom: 0;
      }
      table th {
        min-height: 42px;
        background: #f5f6f7;
        color: #667085;
        font-size: 9px;
        font-weight: 700;
        white-space: nowrap;
      }
      table td {
        min-height: 52px;
        background: #ffffff;
        color: #344054;
        font-size: 9px;
      }
      table tbody tr:nth-child(even) td {
        background: #fcfcfc;
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
        table {
          overflow: visible;
          border-radius: 0;
        }
        tr {
          break-inside: avoid;
          page-break-inside: avoid;
        }

        .report-section {
          break-inside: auto !important;
          page-break-inside: auto !important;
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
