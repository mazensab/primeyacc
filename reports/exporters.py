# ============================================================
# reports/exporters.py
# PrimeyAcc | Reports Export Foundation - Phase 16.7
# ------------------------------------------------------------
# Backend export payload builder foundation
# Supports JSON-ready export envelopes
# CSV foundation without external dependencies
# PDF/Excel placeholders for next integration phases
# ============================================================

from __future__ import annotations

import csv
import io
from dataclasses import dataclass
from typing import Any

from django.core.exceptions import ValidationError
from django.utils import timezone


SUPPORTED_EXPORT_FORMATS = {
    "json",
    "csv",
    "pdf",
    "excel",
}

REPORT_EXPORT_TYPES = {
    "overview",
    "trial_balance",
    "general_ledger",
    "profit_loss",
    "balance_sheet",
    "cash_flow",
}


class ReportExportError(Exception):
    """Raised when a report export request cannot be processed."""


@dataclass(frozen=True)
class ReportExportResult:
    report_type: str
    export_format: str
    filename: str
    content_type: str
    payload: Any
    generated_at: str


def normalize_export_format(value: Any) -> str:
    export_format = str(value or "json").strip().lower()

    aliases = {
        "xlsx": "excel",
        "xls": "excel",
    }

    export_format = aliases.get(export_format, export_format)

    if export_format not in SUPPORTED_EXPORT_FORMATS:
        raise ValidationError(
            {
                "format": (
                    "Unsupported export format. "
                    "Supported formats are: json, csv, pdf, excel."
                )
            }
        )

    return export_format


def normalize_report_type(value: Any) -> str:
    report_type = str(value or "").strip().lower().replace("-", "_")

    if report_type not in REPORT_EXPORT_TYPES:
        raise ValidationError(
            {
                "report": (
                    "Unsupported report type. "
                    "Supported reports are: overview, trial_balance, "
                    "general_ledger, profit_loss, balance_sheet, cash_flow."
                )
            }
        )

    return report_type


def build_export_filename(
    *,
    company: Any,
    report_type: str,
    export_format: str,
) -> str:
    company_part = getattr(company, "slug", None) or getattr(company, "id", "company")
    timestamp = timezone.now().strftime("%Y%m%d-%H%M%S")

    extension = {
        "json": "json",
        "csv": "csv",
        "pdf": "pdf",
        "excel": "xlsx",
    }[export_format]

    return f"{company_part}-{report_type}-{timestamp}.{extension}"


def flatten_report_rows(report_payload: dict[str, Any]) -> list[dict[str, Any]]:
    """
    Convert known report payload shapes into flat rows.

    This is intentionally conservative for Phase 16.7:
    - trial_balance: rows
    - general_ledger: lines
    - profit_loss/balance_sheet/cash_flow: sections
    - overview: available_reports
    """
    if not isinstance(report_payload, dict):
        return []

    if isinstance(report_payload.get("rows"), list):
        return list(report_payload["rows"])

    if isinstance(report_payload.get("lines"), list):
        return list(report_payload["lines"])

    sections = report_payload.get("sections")
    if isinstance(sections, dict):
        rows: list[dict[str, Any]] = []

        for section_name, section_value in sections.items():
            if isinstance(section_value, list):
                for item in section_value:
                    if isinstance(item, dict):
                        rows.append(
                            {
                                "section": section_name,
                                **item,
                            }
                        )
            elif isinstance(section_value, dict):
                rows.append(
                    {
                        "section": section_name,
                        **section_value,
                    }
                )

        return rows

    available_reports = report_payload.get("available_reports")
    if isinstance(available_reports, list):
        return [
            item if isinstance(item, dict) else {"value": item}
            for item in available_reports
        ]

    return []


def _stringify_cell(value: Any) -> str:
    if value is None:
        return ""

    if isinstance(value, dict):
        account = value.get("account")
        if isinstance(account, dict):
            code = account.get("code", "")
            name = account.get("name", "")
            return f"{code} {name}".strip()

        return str(value)

    if isinstance(value, list):
        return ", ".join(_stringify_cell(item) for item in value)

    return str(value)


def build_csv_content(report_payload: dict[str, Any]) -> str:
    rows = flatten_report_rows(report_payload)

    output = io.StringIO()

    if not rows:
        writer = csv.writer(output)
        writer.writerow(["message"])
        writer.writerow(["No rows available for this report."])
        return output.getvalue()

    headers: list[str] = []

    for row in rows:
        if isinstance(row, dict):
            for key in row.keys():
                if key not in headers:
                    headers.append(key)

    writer = csv.DictWriter(output, fieldnames=headers)
    writer.writeheader()

    for row in rows:
        writer.writerow(
            {
                header: _stringify_cell(row.get(header))
                for header in headers
            }
        )

    return output.getvalue()


def build_report_export_result(
    *,
    company: Any,
    report_type: Any,
    export_format: Any,
    report_payload: dict[str, Any],
) -> ReportExportResult:
    normalized_report_type = normalize_report_type(report_type)
    normalized_format = normalize_export_format(export_format)

    filename = build_export_filename(
        company=company,
        report_type=normalized_report_type,
        export_format=normalized_format,
    )

    generated_at = timezone.now().isoformat()

    if normalized_format == "json":
        payload: Any = report_payload
        content_type = "application/json"

    elif normalized_format == "csv":
        payload = build_csv_content(report_payload)
        content_type = "text/csv"

    elif normalized_format == "pdf":
        payload = {
            "status": "not_ready",
            "message": "PDF export foundation is registered. Rendering will be implemented in a later phase.",
            "report": normalized_report_type,
        }
        content_type = "application/json"

    else:
        payload = {
            "status": "not_ready",
            "message": "Excel export foundation is registered. Rendering will be implemented in a later phase.",
            "report": normalized_report_type,
        }
        content_type = "application/json"

    return ReportExportResult(
        report_type=normalized_report_type,
        export_format=normalized_format,
        filename=filename,
        content_type=content_type,
        payload=payload,
        generated_at=generated_at,
    )
