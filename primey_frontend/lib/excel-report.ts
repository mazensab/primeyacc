"use client";

export type ExcelReportLocale = "ar" | "en";
export type ExcelCellType = "text" | "number" | "money";

export type ExcelReportCell = {
  value: string | number | null | undefined;
  type?: ExcelCellType;
};

export type ExcelReportSection = {
  title: string;
  headers: string[];
  rows: ExcelReportCell[][];
  widths?: number[];
};

export type ExcelReportOptions = {
  locale: ExcelReportLocale;
  title: string;
  subtitle?: string;
  filename: string;
  sections: ExcelReportSection[];
  generatedAtLabel?: string;
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

function renderCell(cell: ExcelReportCell) {
  const type = cell.type || "text";
  const rawValue = cell.value ?? "";

  if (type === "money" || type === "number") {
    const numeric =
      typeof rawValue === "number"
        ? rawValue
        : Number(String(rawValue).replace(/[^\d.-]/g, ""));
    const safeNumber = Number.isFinite(numeric) ? numeric : 0;
    const display =
      type === "money"
        ? new Intl.NumberFormat("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(safeNumber)
        : String(safeNumber);

    return `<td class="${type}" x:num="${safeNumber}">${escapeHtml(display)}</td>`;
  }

  return `<td class="text" lang="en-US">&#8203;${escapeHtml(rawValue)}</td>`;
}

export function buildExcelReportDocument({
  locale,
  title,
  subtitle = "",
  sections,
  generatedAtLabel,
}: Omit<ExcelReportOptions, "filename">) {
  const dir = locale === "ar" ? "rtl" : "ltr";
  const generatedLabel =
    generatedAtLabel || (locale === "ar" ? "تم الإنشاء في" : "Generated at");
  const firstSection = sections[0];
  const sheetName = (firstSection?.title || title || "Report").slice(0, 31);

  const sectionsHtml = sections
    .map((section) => {
      const widths = section.widths || [];
      return `
        <tr><td class="section-title" colspan="${Math.max(section.headers.length, 1)}">${escapeHtml(section.title)}</td></tr>
        <tr>
          ${section.headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}
        </tr>
        ${section.rows
          .map(
            (row) =>
              `<tr>${row.map((cell) => renderCell(cell)).join("")}</tr>`,
          )
          .join("")}
        <tr><td class="spacer" colspan="${Math.max(section.headers.length, 1)}"></td></tr>
        ${
          widths.length
            ? `<tr class="width-row">${widths
                .map((width) => `<td style="width:${Math.max(width, 60)}px"></td>`)
                .join("")}</tr>`
            : ""
        }`;
    })
    .join("");

  return `<!doctype html>
<html
  lang="${locale}"
  dir="${dir}"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns="http://www.w3.org/TR/REC-html40"
>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <!--[if gte mso 9]>
    <xml>
      <x:ExcelWorkbook>
        <x:ExcelWorksheets>
          <x:ExcelWorksheet>
            <x:Name>${escapeHtml(sheetName)}</x:Name>
            <x:WorksheetOptions>
              ${locale === "ar" ? "<x:DisplayRightToLeft/>" : ""}
              <x:FreezePanes/>
              <x:FrozenNoSplit/>
              <x:SplitHorizontal>3</x:SplitHorizontal>
              <x:TopRowBottomPane>3</x:TopRowBottomPane>
              <x:FitToPage/>
              <x:Selected/>
            </x:WorksheetOptions>
          </x:ExcelWorksheet>
        </x:ExcelWorksheets>
      </x:ExcelWorkbook>
    </xml>
    <![endif]-->
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 8px;
        color: #111827;
        font-family: Tahoma, Arial, sans-serif;
        font-size: 12px;
      }
      table {
        border-collapse: collapse;
        table-layout: fixed;
      }
      th, td {
        border: 1px solid #000;
        padding: 7px 8px;
        text-align: start;
        vertical-align: middle;
      }
      th {
        background: #e5e7eb;
        font-weight: 700;
        white-space: nowrap;
      }
      .report-title {
        border: 0;
        padding: 0 0 8px;
        font-size: 22px;
        font-weight: 700;
      }
      .report-subtitle,
      .report-meta {
        border: 0;
        padding: 0 0 8px;
        color: #4b5563;
        font-size: 10px;
      }
      .section-title {
        border: 0;
        padding: 12px 0 7px;
        font-size: 15px;
        font-weight: 700;
      }
      .text,
      .number,
      .money {
        direction: ltr;
        unicode-bidi: plaintext;
        font-family: Arial, Tahoma, sans-serif;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .text { mso-number-format: "\\@"; }
      .number {
        mso-number-format: "0";
        text-align: end;
      }
      .money {
        mso-number-format: "0.00";
        text-align: end;
      }
      .spacer {
        height: 8px;
        border: 0;
      }
      .width-row {
        height: 0;
        font-size: 0;
      }
      .width-row td {
        height: 0;
        padding: 0;
        border: 0;
      }
    </style>
  </head>
  <body>
    <table>
      <tr><td class="report-title" colspan="${Math.max(firstSection?.headers.length || 1, 1)}">${escapeHtml(title)}</td></tr>
      ${
        subtitle
          ? `<tr><td class="report-subtitle" colspan="${Math.max(firstSection?.headers.length || 1, 1)}">${escapeHtml(subtitle)}</td></tr>`
          : ""
      }
      <tr><td class="report-meta" colspan="${Math.max(firstSection?.headers.length || 1, 1)}">${escapeHtml(generatedLabel)}: ${escapeHtml(formatReportDateTime())}</td></tr>
      ${sectionsHtml}
    </table>
  </body>
</html>`;
}

export function downloadExcelReport(options: ExcelReportOptions): void {
  if (typeof window === "undefined") {
    return;
  }

  const html = buildExcelReportDocument(options);
  const blob = new Blob(["\uFEFF", html], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = options.filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function downloadExcelHtmlReport(
  html: string,
  filename: string,
): void {
  const blob = new Blob(["\uFEFF", html], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
