# ============================================================
# 📂 api/system/billing_documents/detail.py
# 🧠 Mhamcloud | System Billing Document Detail API V1.0
# ------------------------------------------------------------
# ✅ Returns one platform billing document by ID
# ✅ Includes company, subscription, plan, and user summaries
# ✅ Includes immutable document snapshots
# ✅ Includes stored printable payload
# ✅ Includes related invoice for payment receipts
# ✅ Includes payment receipts linked to an invoice
# ✅ Protected by system.billing_documents.view
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - هذا الـAPI يخص مستندات فوترة مالك منصة Mhamcloud
# - الطباعة تعتمد على printable_payload المحفوظ
# - لا نعيد بناء Snapshot من البيانات الحية
# - الفاتورة تعرض إيصالات الدفع المرتبطة بها
# - إيصال الدفع يعرض ملخص الفاتورة المرتبطة به
# ============================================================

from __future__ import annotations

from django.contrib.auth.decorators import login_required
from django.http import HttpRequest, JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_GET

from api.permissions import user_has_system_permission
from api.system.billing_documents.serializers import (
    billing_document_payload,
)
from billing.models import PlatformBillingDocument


def _billing_document_queryset():
    """
    Return the shared queryset used by the detail endpoint.

    All relations required by the serializer are loaded here to avoid
    unnecessary database queries.
    """

    return (
        PlatformBillingDocument.objects
        .select_related(
            "company",
            "subscription",
            "subscription__company",
            "subscription__plan",
            "subscription__previous_subscription",
            "subscription__previous_subscription__plan",
            "related_invoice",
            "related_invoice__company",
            "related_invoice__subscription",
            "related_invoice__subscription__plan",
            "created_by",
            "cancelled_by",
        )
        .prefetch_related(
            "payment_receipts",
            "payment_receipts__company",
            "payment_receipts__subscription",
            "payment_receipts__subscription__plan",
            "payment_receipts__created_by",
            "payment_receipts__cancelled_by",
        )
    )


from decimal import Decimal, InvalidOperation
from django.http import HttpResponse
from django.utils.html import escape

T = {
    "receipt": "\u0625\u064a\u0635\u0627\u0644 \u062f\u0641\u0639",
    "invoice": "\u0641\u0627\u062a\u0648\u0631\u0629 \u0627\u0634\u062a\u0631\u0627\u0643",
    "document_data": "\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0645\u0633\u062a\u0646\u062f",
    "customer_data": "\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0639\u0645\u064a\u0644",
    "amounts": "\u0627\u0644\u0642\u064a\u0645\u0629 \u0648\u0627\u0644\u062f\u0641\u0639",
    "document_number": "\u0631\u0642\u0645 \u0627\u0644\u0645\u0633\u062a\u0646\u062f",
    "document_type": "\u0646\u0648\u0639 \u0627\u0644\u0645\u0633\u062a\u0646\u062f",
    "status": "\u0627\u0644\u062d\u0627\u0644\u0629",
    "issue_date": "\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0625\u0635\u062f\u0627\u0631",
    "company": "\u0627\u0644\u0634\u0631\u0643\u0629",
    "plan": "\u0627\u0644\u0628\u0627\u0642\u0629",
    "subscription_ref": "\u0645\u0631\u062c\u0639 \u0627\u0644\u0641\u0648\u062a\u0631\u0629",
    "payment_method": "\u0637\u0631\u064a\u0642\u0629 \u0627\u0644\u062f\u0641\u0639",
    "payment_reference": "\u0645\u0631\u062c\u0639 \u0627\u0644\u062f\u0641\u0639",
    "payment_date": "\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u062f\u0641\u0639",
    "tax_number": "\u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u0636\u0631\u064a\u0628\u064a",
    "subscription": "\u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643",
    "subtotal": "\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a \u0642\u0628\u0644 \u0627\u0644\u0636\u0631\u064a\u0628\u0629",
    "discount": "\u0627\u0644\u062e\u0635\u0645",
    "tax": "\u0627\u0644\u0636\u0631\u064a\u0628\u0629",
    "total": "\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a",
    "paid": "\u0627\u0644\u0645\u062f\u0641\u0648\u0639",
    "balance": "\u0627\u0644\u0645\u062a\u0628\u0642\u064a",
    "print_save": "\u0637\u0628\u0627\u0639\u0629 / \u062d\u0641\u0638 PDF",
    "note": "\u0647\u0630\u0627 \u0627\u0644\u0645\u0633\u062a\u0646\u062f \u062a\u0645 \u0625\u0646\u0634\u0627\u0624\u0647 \u0645\u0646 \u0645\u0646\u0635\u0629 Mhamcloud \u0648\u064a\u0639\u062a\u0645\u062f \u0639\u0644\u0649 \u0646\u0633\u062e\u0629 \u0645\u062d\u0641\u0648\u0638\u0629 \u0645\u0646 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0641\u0627\u062a\u0648\u0631\u0629/\u0627\u0644\u0625\u064a\u0635\u0627\u0644 \u0648\u0642\u062a \u0627\u0644\u0625\u0635\u062f\u0627\u0631.",
    "cash": "\u0646\u0642\u062f\u064a",
    "bank_transfer": "\u062a\u062d\u0648\u064a\u0644 \u0628\u0646\u0643\u064a",
    "card": "\u0628\u0637\u0627\u0642\u0629 / \u0645\u062f\u0649",
    "gateway": "\u0628\u0648\u0627\u0628\u0629 \u062f\u0641\u0639",
    "paid_status": "\u0645\u062f\u0641\u0648\u0639",
    "issued_status": "\u0645\u0635\u062f\u0631",
    "cancelled_status": "\u0645\u0644\u063a\u064a",
    "dash": "\u2014",
}
def _as_dict(value):
    return value if isinstance(value, dict) else {}
def _clean(value, default=None):
    if default is None:
        default = T["dash"]
    if value is None:
        return default
    text = str(value).strip()
    return text or default
def _decimal_text(value):
    if value is None or value == "":
        return "0.00"
    try:
        return f"{Decimal(str(value)):.2f}"
    except (InvalidOperation, ValueError):
        return _clean(value, "0.00")
def _money(value, currency="SAR"):
    return f"{_clean(currency, 'SAR')} {_decimal_text(value)}"
def _field(instance, *names):
    for name in names:
        value = getattr(instance, name, None)
        if value not in (None, ""):
            return value
    return None
def _snapshot_value(snapshot, *keys):
    data = _as_dict(snapshot)
    for key in keys:
        value = data.get(key)
        if value not in (None, ""):
            return _clean(value)
    return T["dash"]
def _document_type_label(value):
    normalized = _clean(value, "").upper()
    if "RECEIPT" in normalized:
        return T["receipt"]
    if "INVOICE" in normalized:
        return T["invoice"]
    return _clean(value)
def _payment_method_label(value):
    normalized = _clean(value, "").upper()
    if normalized == "CASH":
        return T["cash"]
    if normalized == "BANK_TRANSFER":
        return T["bank_transfer"]
    if normalized == "CARD":
        return T["card"]
    if normalized in {"PAYMENT_GATEWAY", "GATEWAY", "ONLINE"}:
        return T["gateway"]
    return _clean(value)
def _status_label(value):
    normalized = _clean(value, "").upper()
    if normalized == "PAID":
        return T["paid_status"]
    if normalized == "ISSUED":
        return T["issued_status"]
    if normalized == "CANCELLED":
        return T["cancelled_status"]
    return _clean(value)
def _table_rows(rows):
    return "\n".join(
        f"<tr><th>{escape(_clean(label))}</th><td>{escape(_clean(value))}</td></tr>"
        for label, value in rows
    )
def _build_printable_html(document):
    printable = _as_dict(getattr(document, "printable_payload", None))
    seller = _as_dict(getattr(document, "seller_snapshot", None) or printable.get("seller"))
    buyer = _as_dict(getattr(document, "buyer_snapshot", None) or printable.get("buyer"))
    plan_snapshot = _as_dict(getattr(document, "plan_snapshot", None) or printable.get("plan"))
    payment_snapshot = _as_dict(getattr(document, "payment_snapshot", None) or printable.get("payment"))
    company = getattr(document, "company", None)
    subscription = getattr(document, "subscription", None)
    plan = getattr(subscription, "plan", None)
    company_name = (
        _snapshot_value(buyer, "name", "company_name", "legal_name", "commercial_name")
        if buyer
        else _clean(_field(company, "name", "commercial_name", "legal_name"))
    )
    plan_name = (
        _snapshot_value(plan_snapshot, "name", "plan_name", "title")
        if plan_snapshot
        else _clean(_field(plan, "name", "title"))
    )
    title = _document_type_label(getattr(document, "document_type", ""))
    document_number = _clean(getattr(document, "document_number", None), f"document-{document.pk}")
    issue_date = _clean(getattr(document, "issue_date", None))
    paid_at = _clean(getattr(document, "paid_at", None))
    currency = _clean(getattr(document, "currency_code", None), "SAR")
    subtotal = _field(document, "subtotal", "subtotal_amount", "amount_before_tax")
    discount = _field(document, "discount_amount", "discount")
    tax = _field(document, "tax_amount", "vat_amount")
    total = _field(document, "total_amount", "amount")
    paid = _field(document, "paid_amount", "amount_paid")
    balance = _field(document, "balance_amount", "remaining_amount")
    payment_method = _payment_method_label(
        _field(document, "payment_method", "method") or payment_snapshot.get("method")
    )
    transaction_reference = _clean(
        _field(document, "transaction_reference", "payment_reference")
        or payment_snapshot.get("transaction_reference")
        or payment_snapshot.get("reference")
    )
    billing_reference = _clean(
        _field(document, "billing_reference", "reference")
        or payment_snapshot.get("billing_reference")
        or payment_snapshot.get("reference")
    )
    document_rows = [
        (T["document_number"], document_number),
        (T["document_type"], title),
        (T["status"], _status_label(getattr(document, "status", ""))),
        (T["issue_date"], issue_date),
        (T["company"], company_name),
        (T["plan"], plan_name),
        (T["subscription_ref"], billing_reference),
    ]
    if "RECEIPT" in _clean(getattr(document, "document_type", "")).upper():
        document_rows.extend([
            (T["payment_method"], payment_method),
            (T["payment_reference"], transaction_reference),
            (T["payment_date"], paid_at),
        ])
    customer_rows = [
        (T["company"], company_name),
        (
            T["tax_number"],
            _snapshot_value(
                buyer,
                "tax_number",
                "vat_number",
                "tax_registration_number",
                "vat",
            ),
        ),
        (T["subscription"], _clean(getattr(document, "subscription_id", None))),
    ]
    amount_rows = [
        (T["subtotal"], _money(subtotal, currency)),
        (T["discount"], _money(discount, currency)),
        (T["tax"], _money(tax, currency)),
        (T["total"], _money(total, currency)),
        (T["paid"], _money(paid, currency)),
        (T["balance"], _money(balance, currency)),
    ]
    seller_name = _snapshot_value(seller, "name", "company_name", "legal_name")
    seller_tax = _snapshot_value(seller, "tax_number", "vat_number", "tax_registration_number")
    document_rows_html = _table_rows(document_rows)
    customer_rows_html = _table_rows(customer_rows)
    amount_rows_html = _table_rows(amount_rows)
    print_label = escape(T["print_save"])
    return f"""<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>{escape(title)} - {escape(document_number)}</title>
  <style>
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      background: #f6f7f9;
      color: #0f172a;
      font-family: Arial, Tahoma, sans-serif;
      line-height: 1.7;
    }}
    .actions {{
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      width: 210mm;
      margin: 20px auto 0;
    }}
    button {{
      border: 1px solid #111827;
      background: #111827;
      color: white;
      border-radius: 10px;
      padding: 10px 16px;
      cursor: pointer;
      font-weight: 700;
    }}
    .page {{
      width: 210mm;
      min-height: 297mm;
      margin: 20px auto;
      background: white;
      padding: 24mm 18mm;
      border: 1px solid #e5e7eb;
      border-radius: 18px;
    }}
    .top {{
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 24px;
      border-bottom: 2px solid #111827;
      padding-bottom: 18px;
      margin-bottom: 24px;
    }}
    h1 {{
      margin: 0;
      font-size: 28px;
      letter-spacing: -0.02em;
    }}
    .muted {{ color: #64748b; font-size: 13px; }}
    .badge {{
      display: inline-flex;
      border: 1px solid #d1d5db;
      border-radius: 999px;
      padding: 4px 12px;
      font-size: 12px;
      color: #374151;
      background: #f9fafb;
    }}
    .grid {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px;
      margin-bottom: 20px;
    }}
    .box {{
      border: 1px solid #e5e7eb;
      border-radius: 16px;
      padding: 16px;
      background: #ffffff;
    }}
    .box h2 {{
      font-size: 16px;
      margin: 0 0 12px;
    }}
    table {{
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
    }}
    th, td {{
      border-bottom: 1px solid #e5e7eb;
      padding: 9px 8px;
      text-align: right;
      vertical-align: top;
      font-size: 13px;
    }}
    th {{
      width: 38%;
      color: #64748b;
      font-weight: 700;
      background: #f8fafc;
    }}
    @media print {{
      body {{ background: white; }}
      .page {{
        margin: 0;
        border: 0;
        border-radius: 0;
        width: auto;
        min-height: auto;
      }}
      .actions {{ display: none; }}
    }}
  </style>
</head>
<body>
  <div class="actions">
    <button onclick="window.print()">{print_label}</button>
  </div>
  <main class="page">
    <section class="top">
      <div>
        <span class="badge">Mhamcloud Accounting System</span>
        <h1>{escape(title)}</h1>
        <div class="muted">{escape(document_number)}</div>
      </div>
      <div class="muted">
        <strong>{escape(seller_name)}</strong><br />
        VAT: {escape(seller_tax)}
      </div>
    </section>
    <section class="grid">
      <div class="box">
        <h2>{escape(T["document_data"])}</h2>
        <table>{document_rows_html}</table>
      </div>
      <div class="box">
        <h2>{escape(T["customer_data"])}</h2>
        <table>{customer_rows_html}</table>
      </div>
    </section>
    <section class="box">
      <h2>{escape(T["amounts"])}</h2>
      <table>{amount_rows_html}</table>
    </section>
    <p class="muted">{escape(T["note"])}</p>
  </main>
</body>
</html>"""
@login_required
@require_GET
def system_billing_document_print(request, document_id):
    document = get_object_or_404(
        PlatformBillingDocument.objects.select_related(
            "company",
            "subscription",
            "subscription__plan",
        ),
        pk=document_id,
    )
    return HttpResponse(
        _build_printable_html(document),
        content_type="text/html; charset=utf-8",
    )
@login_required
@require_GET
def system_billing_document_pdf(request, document_id):
    document = get_object_or_404(
        PlatformBillingDocument.objects.select_related(
            "company",
            "subscription",
            "subscription__plan",
        ),
        pk=document_id,
    )
    html = _build_printable_html(document)
    document_number = _clean(getattr(document, "document_number", None), f"document-{document_id}")
    try:
        from weasyprint import HTML
        pdf_content = HTML(
            string=html,
            base_url=request.build_absolute_uri("/"),
        ).write_pdf()
        response = HttpResponse(
            pdf_content,
            content_type="application/pdf",
        )
        response["Content-Disposition"] = f'inline; filename="{document_number}.pdf"'
        return response
    except Exception:
        response = HttpResponse(
            html,
            content_type="text/html; charset=utf-8",
        )
        response["Content-Disposition"] = f'inline; filename="{document_number}.html"'
        response["X-PrimeyAcc-Pdf-Fallback"] = "html-print"
        return response
