# ============================================================
# 📂 documents/rendering.py
# 🧠 Mhamcloud | Document Rendering Services V1.0
# ------------------------------------------------------------
# ✅ Company-scoped document rendering foundation
# ✅ Web print HTML generation
# ✅ Thermal receipt HTML generation
# ✅ Minimal PDF bytes generation without external dependencies
# ✅ Sales invoice / sales order / POS receipt source resolution
# ✅ Direct preview payload support
# ✅ Default DocumentTemplate resolution
# ✅ Tenant isolation through company-bound source lookup
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا يتم أخذ company_id من الواجهة كمصدر ثقة
# - الشركة يجب أن تصل من request.company أو طبقة خدمة موثوقة
# - هذه الطبقة لا ترحل محاسبيا ولا تنشئ حركات مخزون ولا مدفوعات
# - PDF هنا Foundation آمن وخفيف بدون اعتماد خارجي
# - الطباعة الحرارية ترجع HTML جاهز للواجهة أو محرك الطباعة
# ============================================================

from __future__ import annotations

import base64
import html
import re
from dataclasses import dataclass
from decimal import Decimal
from typing import Any

from django.core.exceptions import ValidationError
from django.utils import timezone

from .models import DocumentTemplate, DocumentTemplateLayout, DocumentType
from .services import get_default_document_template


SUPPORTED_OUTPUT_FORMATS = {
    "PAYLOAD",
    "WEB_PRINT",
    "THERMAL",
    "PDF",
}

SUPPORTED_SOURCE_TYPES = {
    "preview",
    "sales_invoice",
    "sales_order",
    "pos_order",
    "pos_receipt",
}

THERMAL_WIDTHS = {
    "58MM": "58mm",
    "80MM": "80mm",
}


@dataclass(frozen=True)
class DocumentRenderRequest:
    """
    Normalized document render request.
    """

    document_type: str
    source_type: str = "preview"
    source_id: int | None = None
    output_format: str = "PAYLOAD"
    template_id: int | None = None
    paper_size: str = "A4"
    thermal_width: str = "80MM"
    source_payload: dict[str, Any] | None = None
    language: str = "ar"


def _clean_text(value: Any, default: str = "") -> str:
    """
    Normalize text values safely.
    """
    value = str(value or "").strip()
    return value or default


def _clean_upper(value: Any, default: str = "") -> str:
    """
    Normalize upper-case enum-like values.
    """
    return _clean_text(value, default).upper()


def _clean_positive_int(value: Any, field_name: str) -> int | None:
    """
    Normalize positive integer values.
    """
    if value in [None, ""]:
        return None

    try:
        number = int(value)
    except (TypeError, ValueError) as exc:
        raise ValidationError({field_name: "Must be a valid positive integer."}) from exc

    if number < 1:
        raise ValidationError({field_name: "Must be a valid positive integer."})

    return number


def _money(value: Any) -> str:
    """
    Convert money-like values to stable string.
    """
    if value in [None, ""]:
        value = Decimal("0.00")

    try:
        return str(Decimal(str(value)).quantize(Decimal("0.01")))
    except Exception:
        return str(value)


def _safe_iso(value: Any) -> str | None:
    """
    Return ISO value when possible.
    """
    if not value:
        return None

    if hasattr(value, "isoformat"):
        return value.isoformat()

    return str(value)


def _display_name(obj: Any) -> str:
    """
    Return a safe display name for any model-like object.
    """
    if not obj:
        return ""

    return (
        getattr(obj, "display_name", None)
        or getattr(obj, "legal_name", None)
        or getattr(obj, "name_ar", None)
        or getattr(obj, "name_en", None)
        or getattr(obj, "name", None)
        or str(obj)
    )


def _serialize_company(company) -> dict[str, Any]:
    """
    Build company block for documents.
    """
    return {
        "id": getattr(company, "id", None),
        "name": _display_name(company),
        "company_code": getattr(company, "company_code", ""),
        "email": getattr(company, "email", ""),
        "phone": getattr(company, "phone", ""),
        "tax_number": (
            getattr(company, "tax_number", "")
            or getattr(company, "vat_number", "")
        ),
        "commercial_registration": (
            getattr(company, "commercial_registration", "")
            or getattr(company, "cr_number", "")
        ),
        "address": getattr(company, "address", ""),
        "currency_code": getattr(company, "currency_code", "SAR") or "SAR",
    }


def normalize_document_render_request(data: dict[str, Any] | None) -> DocumentRenderRequest:
    """
    Normalize and validate rendering request.
    """
    payload = data or {}

    document_type = _clean_upper(payload.get("document_type"))
    allowed_document_types = {choice.value for choice in DocumentType}

    if not document_type:
        raise ValidationError({"document_type": "Document type is required."})

    if document_type not in allowed_document_types:
        raise ValidationError({"document_type": "Invalid document type."})

    source_type = _clean_upper(payload.get("source_type") or "preview").lower()
    if source_type not in SUPPORTED_SOURCE_TYPES:
        raise ValidationError({"source_type": "Invalid source type."})

    output_format = _clean_upper(payload.get("output_format") or payload.get("format") or "PAYLOAD")
    if output_format not in SUPPORTED_OUTPUT_FORMATS:
        raise ValidationError({"output_format": "Invalid output format."})

    template_id = _clean_positive_int(payload.get("template_id"), "template_id")
    source_id = _clean_positive_int(payload.get("source_id"), "source_id")

    if source_type != "preview" and not source_id:
        raise ValidationError({"source_id": "Source id is required for this source type."})

    source_payload = payload.get("source_payload")
    if source_payload is not None and not isinstance(source_payload, dict):
        raise ValidationError({"source_payload": "Source payload must be an object."})

    thermal_width = _clean_upper(payload.get("thermal_width") or "80MM")
    if thermal_width not in THERMAL_WIDTHS:
        raise ValidationError({"thermal_width": "Thermal width must be 58MM or 80MM."})

    return DocumentRenderRequest(
        document_type=document_type,
        source_type=source_type,
        source_id=source_id,
        output_format=output_format,
        template_id=template_id,
        paper_size=_clean_upper(payload.get("paper_size") or "A4", "A4"),
        thermal_width=thermal_width,
        source_payload=source_payload,
        language=_clean_text(payload.get("language") or "ar", "ar"),
    )


def resolve_document_template(
    *,
    company,
    document_type: str,
    template_id: int | None = None,
) -> DocumentTemplate | None:
    """
    Resolve template inside current company.
    """
    if not company:
        raise ValidationError({"company": "Company context is required."})

    if template_id:
        template = (
            DocumentTemplate.objects.filter(
                company=company,
                id=template_id,
                document_type=document_type,
            )
            .first()
        )

        if not template:
            raise ValidationError({"template_id": "Document template was not found."})

        if not template.is_active:
            raise ValidationError({"template_id": "Document template is not active."})

        return template

    return get_default_document_template(
        company=company,
        document_type=document_type,
    )


def _resolve_sales_invoice_payload(*, company, source_id: int) -> dict[str, Any]:
    """
    Resolve sales invoice payload inside company.
    """
    from sales.models import SalesInvoice
    from sales.services import serialize_sales_invoice

    invoice = (
        SalesInvoice.objects.select_related(
            "company",
            "branch",
            "customer",
            "source_order",
        )
        .prefetch_related("items", "items__catalog_item")
        .filter(company=company, id=source_id)
        .first()
    )

    if not invoice:
        raise ValidationError({"source_id": "Sales invoice was not found."})

    return serialize_sales_invoice(invoice, include_items=True)


def _resolve_sales_order_payload(*, company, source_id: int) -> dict[str, Any]:
    """
    Resolve sales order payload inside company.
    """
    from sales.models import SalesOrder
    from sales.services import serialize_sales_order

    order = (
        SalesOrder.objects.select_related(
            "company",
            "branch",
            "customer",
        )
        .prefetch_related("items", "items__catalog_item")
        .filter(company=company, id=source_id)
        .first()
    )

    if not order:
        raise ValidationError({"source_id": "Sales order was not found."})

    return serialize_sales_order(order, include_items=True)


def _resolve_pos_receipt_payload(*, company, source_id: int) -> dict[str, Any]:
    """
    Resolve POS order receipt payload inside company.
    """
    from api.company.pos.orders.receipt import build_pos_order_receipt
    from pos.models import POSOrder

    order = (
        POSOrder.objects.select_related(
            "company",
            "session",
            "register",
            "branch",
            "customer",
            "created_by",
        )
        .prefetch_related("items", "payments")
        .filter(company=company, id=source_id)
        .first()
    )

    if not order:
        raise ValidationError({"source_id": "POS order was not found."})

    return build_pos_order_receipt(order)


def resolve_document_source_payload(
    *,
    company,
    request_data: DocumentRenderRequest,
) -> dict[str, Any]:
    """
    Resolve document source payload.
    """
    if request_data.source_type == "preview":
        return request_data.source_payload or {
            "document_number": "PREVIEW-000001",
            "document_date": timezone.localdate().isoformat(),
            "customer": {
                "display_name": "Preview Customer",
                "vat_number": "300000000000003",
            },
            "items": [
                {
                    "item_name": "Preview Item",
                    "quantity": "1.0000",
                    "unit_price": "100.00",
                    "tax_amount": "15.00",
                    "line_total": "115.00",
                }
            ],
            "subtotal": "100.00",
            "discount_amount": "0.00",
            "taxable_amount": "100.00",
            "tax_amount": "15.00",
            "total_amount": "115.00",
            "currency_code": "SAR",
        }

    if request_data.source_type == "sales_invoice":
        return _resolve_sales_invoice_payload(
            company=company,
            source_id=request_data.source_id,
        )

    if request_data.source_type == "sales_order":
        return _resolve_sales_order_payload(
            company=company,
            source_id=request_data.source_id,
        )

    if request_data.source_type in ["pos_order", "pos_receipt"]:
        return _resolve_pos_receipt_payload(
            company=company,
            source_id=request_data.source_id,
        )

    raise ValidationError({"source_type": "Unsupported source type."})


def _document_number(source_payload: dict[str, Any]) -> str:
    """
    Extract best document number.
    """
    return (
        source_payload.get("invoice_number")
        or source_payload.get("order_number")
        or source_payload.get("receipt_number")
        or source_payload.get("document_number")
        or source_payload.get("number")
        or ""
    )


def _document_date(source_payload: dict[str, Any]) -> str:
    """
    Extract best document date.
    """
    return (
        source_payload.get("invoice_date")
        or source_payload.get("order_date")
        or source_payload.get("issued_at")
        or source_payload.get("created_at")
        or source_payload.get("document_date")
        or ""
    )


def _party_payload(source_payload: dict[str, Any]) -> dict[str, Any]:
    """
    Extract customer/vendor/party payload.
    """
    party = (
        source_payload.get("customer")
        or source_payload.get("supplier")
        or source_payload.get("party")
        or source_payload.get("customer_snapshot")
        or {}
    )

    return party if isinstance(party, dict) else {}


def _line_items(source_payload: dict[str, Any]) -> list[dict[str, Any]]:
    """
    Extract document lines from common payload shapes.
    """
    for key in ["items", "lines"]:
        value = source_payload.get(key)
        if isinstance(value, list):
            return [item for item in value if isinstance(item, dict)]

    raw_order = source_payload.get("raw_order")
    if isinstance(raw_order, dict):
        value = raw_order.get("items") or raw_order.get("lines")
        if isinstance(value, list):
            return [item for item in value if isinstance(item, dict)]

    return []


def _totals_payload(source_payload: dict[str, Any]) -> dict[str, Any]:
    """
    Extract totals payload.
    """
    totals = source_payload.get("totals")
    if isinstance(totals, dict):
        return totals

    return source_payload


def build_document_render_payload(
    *,
    company,
    request_data: DocumentRenderRequest,
) -> dict[str, Any]:
    """
    Build normalized rendering payload.
    """
    template = resolve_document_template(
        company=company,
        document_type=request_data.document_type,
        template_id=request_data.template_id,
    )
    source_payload = resolve_document_source_payload(
        company=company,
        request_data=request_data,
    )

    totals = _totals_payload(source_payload)
    party = _party_payload(source_payload)
    lines = _line_items(source_payload)

    template_payload = None
    if template:
        template_payload = {
            "id": template.id,
            "name": template.name,
            "document_type": template.document_type,
            "layout_style": template.layout_style,
            "primary_color": template.primary_color,
            "secondary_color": template.secondary_color,
            "show_logo": template.show_logo,
            "show_qr": template.show_qr,
            "show_vat_number": template.show_vat_number,
            "show_commercial_registration": template.show_commercial_registration,
            "header_text": template.header_text,
            "footer_text": template.footer_text,
            "terms_and_conditions": template.terms_and_conditions,
        }

    return {
        "document": {
            "document_type": request_data.document_type,
            "source_type": request_data.source_type,
            "source_id": request_data.source_id,
            "number": _document_number(source_payload),
            "date": _document_date(source_payload),
            "generated_at": timezone.now().isoformat(),
            "paper_size": request_data.paper_size,
            "thermal_width": request_data.thermal_width,
            "language": request_data.language,
        },
        "company": _serialize_company(company),
        "template": template_payload,
        "party": party,
        "lines": lines,
        "totals": {
            "subtotal": _money(
                totals.get("subtotal")
                or totals.get("subtotal_amount")
                or totals.get("line_subtotal")
            ),
            "discount_amount": _money(totals.get("discount_amount")),
            "taxable_amount": _money(totals.get("taxable_amount")),
            "tax_amount": _money(totals.get("tax_amount")),
            "total_amount": _money(
                totals.get("total_amount")
                or totals.get("line_total")
            ),
            "paid_amount": _money(totals.get("paid_amount")),
            "balance_due": _money(
                totals.get("balance_due")
                or totals.get("remaining_amount")
            ),
            "currency_code": (
                totals.get("currency_code")
                or totals.get("currency")
                or source_payload.get("currency_code")
                or "SAR"
            ),
        },
        "source": source_payload,
    }


def _line_value(line: dict[str, Any], *keys: str) -> Any:
    """
    Return first available line value.
    """
    for key in keys:
        value = line.get(key)
        if value not in [None, ""]:
            return value

    return ""


def render_document_html(render_payload: dict[str, Any], *, thermal: bool = False) -> str:
    """
    Render print-ready HTML.
    """
    doc = render_payload["document"]
    company = render_payload["company"]
    template = render_payload.get("template") or {}
    party = render_payload.get("party") or {}
    totals = render_payload.get("totals") or {}
    lines = render_payload.get("lines") or []

    direction = "rtl" if doc.get("language") == "ar" else "ltr"
    width_css = THERMAL_WIDTHS.get(doc.get("thermal_width", "80MM"), "80mm") if thermal else "210mm"
    font_size = "11px" if thermal else "13px"
    padding = "6px" if thermal else "18px"

    rows = []
    for index, line in enumerate(lines, start=1):
        item_name = _line_value(line, "item_name", "item_name_snapshot", "name", "description")
        quantity = _line_value(line, "quantity", "qty")
        unit_price = _line_value(line, "unit_price", "price")
        tax_amount = _line_value(line, "tax_amount")
        line_total = _line_value(line, "line_total", "total_amount")

        rows.append(
            "<tr>"
            f"<td>{index}</td>"
            f"<td>{html.escape(str(item_name))}</td>"
            f"<td>{html.escape(str(quantity))}</td>"
            f"<td>{html.escape(str(unit_price))}</td>"
            f"<td>{html.escape(str(tax_amount))}</td>"
            f"<td>{html.escape(str(line_total))}</td>"
            "</tr>"
        )

    rows_html = "\n".join(rows) or (
        "<tr><td colspan='6' class='empty'>No lines</td></tr>"
    )

    title = doc.get("document_type", "").replace("_", " ").title()
    primary_color = template.get("primary_color") or "#111827"
    secondary_color = template.get("secondary_color") or "#6B7280"

    return f"""<!doctype html>
<html lang="{html.escape(doc.get("language") or "ar")}" dir="{direction}">
<head>
<meta charset="utf-8">
<title>{html.escape(title)} {html.escape(str(doc.get("number") or ""))}</title>
<style>
@page {{
  size: {"auto" if thermal else "A4"};
  margin: {"0" if thermal else "12mm"};
}}
* {{
  box-sizing: border-box;
}}
body {{
  margin: 0;
  background: #ffffff;
  color: #111827;
  font-family: Arial, Tahoma, sans-serif;
  font-size: {font_size};
}}
.document {{
  width: {width_css};
  max-width: 100%;
  margin: 0 auto;
  padding: {padding};
}}
.header {{
  border-bottom: 2px solid {primary_color};
  padding-bottom: 10px;
  margin-bottom: 12px;
}}
.company-name {{
  font-size: {"16px" if thermal else "22px"};
  font-weight: 700;
  color: {primary_color};
}}
.muted {{
  color: {secondary_color};
}}
.meta, .party, .totals {{
  width: 100%;
  margin-top: 10px;
  border-collapse: collapse;
}}
.meta td, .party td, .totals td {{
  padding: 4px 0;
}}
.lines {{
  width: 100%;
  margin-top: 12px;
  border-collapse: collapse;
}}
.lines th, .lines td {{
  border-bottom: 1px solid #e5e7eb;
  padding: {"4px 2px" if thermal else "8px 6px"};
  text-align: start;
}}
.lines th {{
  background: #f9fafb;
  color: {primary_color};
}}
.total-row {{
  font-weight: 700;
  color: {primary_color};
}}
.footer {{
  margin-top: 14px;
  padding-top: 10px;
  border-top: 1px dashed #d1d5db;
  text-align: center;
  color: {secondary_color};
}}
.empty {{
  text-align: center;
  color: {secondary_color};
}}
@media print {{
  body {{
    background: white;
  }}
  .document {{
    margin: 0;
  }}
}}
</style>
</head>
<body>
  <main class="document">
    <section class="header">
      <div class="company-name">{html.escape(str(company.get("name") or ""))}</div>
      <div class="muted">{html.escape(str(company.get("company_code") or ""))}</div>
      <div class="muted">{html.escape(str(company.get("phone") or ""))} {html.escape(str(company.get("email") or ""))}</div>
      <div class="muted">VAT: {html.escape(str(company.get("tax_number") or ""))}</div>
      <p>{html.escape(str(template.get("header_text") or ""))}</p>
    </section>

    <table class="meta">
      <tr><td>Document</td><td>{html.escape(title)}</td></tr>
      <tr><td>Number</td><td>{html.escape(str(doc.get("number") or ""))}</td></tr>
      <tr><td>Date</td><td>{html.escape(str(doc.get("date") or ""))}</td></tr>
      <tr><td>Generated</td><td>{html.escape(str(doc.get("generated_at") or ""))}</td></tr>
    </table>

    <table class="party">
      <tr><td>Party</td><td>{html.escape(str(party.get("display_name") or party.get("legal_name") or party.get("name") or ""))}</td></tr>
      <tr><td>VAT</td><td>{html.escape(str(party.get("vat_number") or ""))}</td></tr>
      <tr><td>Phone</td><td>{html.escape(str(party.get("phone") or party.get("mobile") or ""))}</td></tr>
    </table>

    <table class="lines">
      <thead>
        <tr>
          <th>#</th>
          <th>Item</th>
          <th>Qty</th>
          <th>Price</th>
          <th>VAT</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        {rows_html}
      </tbody>
    </table>

    <table class="totals">
      <tr><td>Subtotal</td><td>{html.escape(str(totals.get("subtotal") or "0.00"))}</td></tr>
      <tr><td>Discount</td><td>{html.escape(str(totals.get("discount_amount") or "0.00"))}</td></tr>
      <tr><td>Taxable</td><td>{html.escape(str(totals.get("taxable_amount") or "0.00"))}</td></tr>
      <tr><td>VAT</td><td>{html.escape(str(totals.get("tax_amount") or "0.00"))}</td></tr>
      <tr class="total-row"><td>Total</td><td>{html.escape(str(totals.get("total_amount") or "0.00"))} {html.escape(str(totals.get("currency_code") or "SAR"))}</td></tr>
      <tr><td>Paid</td><td>{html.escape(str(totals.get("paid_amount") or "0.00"))}</td></tr>
      <tr><td>Balance</td><td>{html.escape(str(totals.get("balance_due") or "0.00"))}</td></tr>
    </table>

    <section class="footer">
      <div>{html.escape(str(template.get("footer_text") or "Thank you"))}</div>
      <div>{html.escape(str(template.get("terms_and_conditions") or ""))}</div>
    </section>
  </main>
</body>
</html>"""


def _pdf_escape(value: str) -> str:
    """
    Escape text for a simple PDF text object.
    """
    return (
        value.replace("\\", "\\\\")
        .replace("(", "\\(")
        .replace(")", "\\)")
    )


def _plain_text_from_render_payload(render_payload: dict[str, Any]) -> list[str]:
    """
    Convert render payload to PDF text lines.
    """
    doc = render_payload["document"]
    company = render_payload["company"]
    party = render_payload.get("party") or {}
    totals = render_payload.get("totals") or {}
    lines = render_payload.get("lines") or []

    output = [
        _clean_text(company.get("name")),
        f"Document: {doc.get('document_type')}",
        f"Number: {doc.get('number')}",
        f"Date: {doc.get('date')}",
        f"VAT: {company.get('tax_number') or ''}",
        f"Party: {party.get('display_name') or party.get('legal_name') or party.get('name') or ''}",
        "-" * 64,
    ]

    for index, line in enumerate(lines[:24], start=1):
        item_name = _line_value(line, "item_name", "item_name_snapshot", "name", "description")
        quantity = _line_value(line, "quantity", "qty")
        total = _line_value(line, "line_total", "total_amount")
        output.append(f"{index}. {item_name} | Qty {quantity} | Total {total}")

    output.extend(
        [
            "-" * 64,
            f"Subtotal: {totals.get('subtotal')}",
            f"VAT: {totals.get('tax_amount')}",
            f"Total: {totals.get('total_amount')} {totals.get('currency_code')}",
            f"Paid: {totals.get('paid_amount')}",
            f"Balance: {totals.get('balance_due')}",
        ]
    )

    return [re.sub(r"[^\x20-\x7E]", "?", str(line)) for line in output]


def render_minimal_pdf_bytes(render_payload: dict[str, Any]) -> bytes:
    """
    Generate a minimal valid PDF.

    This is intentionally dependency-free for Phase 24 foundation.
    Advanced branded PDF rendering can later use a dedicated renderer.
    """
    lines = _plain_text_from_render_payload(render_payload)

    y = 800
    text_commands = ["BT", "/F1 10 Tf"]
    for line in lines:
        text_commands.append(f"50 {y} Td ({_pdf_escape(line[:105])}) Tj")
        y = -14

    text_commands.append("ET")
    stream = "\n".join(text_commands).encode("latin-1", errors="replace")

    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        b"<< /Length " + str(len(stream)).encode("ascii") + b" >>\nstream\n" + stream + b"\nendstream",
    ]

    pdf = bytearray()
    pdf.extend(b"%PDF-1.4\n")
    offsets = [0]

    for index, obj in enumerate(objects, start=1):
        offsets.append(len(pdf))
        pdf.extend(f"{index} 0 obj\n".encode("ascii"))
        pdf.extend(obj)
        pdf.extend(b"\nendobj\n")

    xref_position = len(pdf)
    pdf.extend(f"xref\n0 {len(objects) + 1}\n".encode("ascii"))
    pdf.extend(b"0000000000 65535 f \n")

    for offset in offsets[1:]:
        pdf.extend(f"{offset:010d} 00000 n \n".encode("ascii"))

    pdf.extend(
        (
            "trailer\n"
            f"<< /Size {len(objects) + 1} /Root 1 0 R >>\n"
            "startxref\n"
            f"{xref_position}\n"
            "%%EOF\n"
        ).encode("ascii")
    )

    return bytes(pdf)


def build_document_response_payload(
    *,
    company,
    request_data: DocumentRenderRequest,
) -> dict[str, Any]:
    """
    Build complete response payload including optional HTML/PDF data.
    """
    render_payload = build_document_render_payload(
        company=company,
        request_data=request_data,
    )

    result = {
        "render": render_payload,
        "html": None,
        "pdf_base64": None,
        "content_type": "application/json",
        "filename": build_document_filename(render_payload, request_data.output_format),
    }

    if request_data.output_format in ["WEB_PRINT", "THERMAL"]:
        result["html"] = render_document_html(
            render_payload,
            thermal=request_data.output_format == "THERMAL",
        )
        result["content_type"] = "text/html"

    if request_data.output_format == "PDF":
        pdf_bytes = render_minimal_pdf_bytes(render_payload)
        result["pdf_base64"] = base64.b64encode(pdf_bytes).decode("ascii")
        result["content_type"] = "application/pdf"

    return result


def build_document_filename(
    render_payload: dict[str, Any],
    output_format: str,
) -> str:
    """
    Build safe output filename.
    """
    doc = render_payload.get("document") or {}
    document_type = _clean_text(doc.get("document_type"), "document").lower()
    number = _clean_text(doc.get("number"), "preview")
    safe_number = re.sub(r"[^A-Za-z0-9_.-]+", "-", number).strip("-") or "preview"
    extension = "pdf" if output_format == "PDF" else "html"

    if output_format == "PAYLOAD":
        extension = "json"

    return f"{document_type}-{safe_number}.{extension}"


def supported_document_rendering_options() -> dict[str, Any]:
    """
    Return supported document rendering options.
    """
    return {
        "document_types": [
            {"value": value, "label": label}
            for value, label in DocumentType.choices
        ],
        "source_types": sorted(SUPPORTED_SOURCE_TYPES),
        "output_formats": sorted(SUPPORTED_OUTPUT_FORMATS),
        "thermal_widths": sorted(THERMAL_WIDTHS.keys()),
        "template_layouts": [
            {"value": value, "label": label}
            for value, label in DocumentTemplateLayout.choices
        ],
    }
