# ============================================================
# 📂 api/company/jewelry/views.py
# 🧠 PrimeyAcc | Company Jewelry APIs — Phase 25.1
# ============================================================
# ✅ Company-scoped APIs for jewelry and gold foundation
# ✅ Metals, karats, gold rates, items, pricing estimate and summary
# ✅ Lightweight JsonResponse views compatible with existing Django stack
# ✅ Safe input parsing and error responses
# ============================================================
# القاعدة المعتمدة:
# - لا يتم إنشاء dashboard API منفصل.
# - هذه واجهات نشاط الذهب فقط وتخدم صفحات النشاط لاحقا.
# - company scope مطلوب دائما.
# ============================================================

import json
from decimal import Decimal

from django.http import JsonResponse
from django.views.decorators.http import require_http_methods

from companies.models import Company
from jewelry.models import (
    JewelryGoldRate,
    JewelryItem,
    JewelryKarat,
    JewelryMakingChargeType,
    JewelryMetal,
)
from jewelry.services import (
    create_gold_rate,
    estimate_jewelry_price,
    gold_rate_payload,
    jewelry_item_payload,
    jewelry_summary_payload,
    karat_payload,
    metal_payload,
    price_jewelry_item,
    seed_default_jewelry_foundation,
)


def _json_error(message, status=400, details=None):
    payload = {"ok": False, "error": message}
    if details is not None:
        payload["details"] = details
    return JsonResponse(payload, status=status)


def _request_data(request):
    if request.body:
        try:
            return json.loads(request.body.decode("utf-8"))
        except json.JSONDecodeError:
            return {}
    return request.POST.dict()


def _resolve_company(request):
    company = getattr(request, "company", None)
    if company is not None:
        return company

    company_id = request.GET.get("company_id") or request.headers.get("X-Company-ID")
    if company_id:
        return Company.objects.filter(id=company_id).first()

    user = getattr(request, "user", None)
    if user is not None and getattr(user, "is_authenticated", False):
        for attr in ("company", "current_company", "company_ref"):
            candidate = getattr(user, attr, None)
            if candidate is not None:
                return candidate

    return None


def _require_company(request):
    company = _resolve_company(request)
    if company is None:
        return None, _json_error("Company scope is required.", status=400)
    return company, None


@require_http_methods(["GET", "POST"])
def metals_view(request):
    company, error = _require_company(request)
    if error:
        return error

    if request.method == "POST":
        data = _request_data(request)
        try:
            metal = JewelryMetal.objects.create(
                company=company,
                code=str(data.get("code", "")).strip().upper(),
                name=str(data.get("name", "")).strip(),
                metal_type=data.get("metal_type", "gold"),
                purity_percent=Decimal(str(data.get("purity_percent", "100.0000"))),
                is_active=bool(data.get("is_active", True)),
                notes=data.get("notes", "") or "",
            )
        except Exception as exc:
            return _json_error("Unable to create jewelry metal.", details=str(exc))
        return JsonResponse({"ok": True, "metal": metal_payload(metal)}, status=201)

    qs = JewelryMetal.objects.filter(company=company).order_by("metal_type", "code")
    return JsonResponse({"ok": True, "results": [metal_payload(obj) for obj in qs]})


@require_http_methods(["GET", "POST"])
def karats_view(request):
    company, error = _require_company(request)
    if error:
        return error

    if request.method == "POST":
        data = _request_data(request)
        metal = JewelryMetal.objects.filter(company=company, id=data.get("metal_id")).first()
        if metal is None:
            return _json_error("Valid metal_id is required.")

        try:
            karat = JewelryKarat.objects.create(
                company=company,
                metal=metal,
                code=str(data.get("code", "")).strip().upper(),
                name=str(data.get("name", "")).strip(),
                karat_value=Decimal(str(data.get("karat_value", "0"))),
                purity_percent=Decimal(str(data.get("purity_percent", "0"))),
                is_default=bool(data.get("is_default", False)),
                is_active=bool(data.get("is_active", True)),
                notes=data.get("notes", "") or "",
            )
        except Exception as exc:
            return _json_error("Unable to create jewelry karat.", details=str(exc))
        return JsonResponse({"ok": True, "karat": karat_payload(karat)}, status=201)

    qs = JewelryKarat.objects.filter(company=company).select_related("metal").order_by("-karat_value", "code")
    return JsonResponse({"ok": True, "results": [karat_payload(obj) for obj in qs]})


@require_http_methods(["POST"])
def seed_view(request):
    company, error = _require_company(request)
    if error:
        return error

    result = seed_default_jewelry_foundation(company)
    return JsonResponse(
        {
            "ok": True,
            "metal": metal_payload(result["metal"]),
            "karats": [karat_payload(obj) for obj in result["karats"]],
        }
    )


@require_http_methods(["GET", "POST"])
def gold_rates_view(request):
    company, error = _require_company(request)
    if error:
        return error

    if request.method == "POST":
        data = _request_data(request)
        metal = JewelryMetal.objects.filter(company=company, id=data.get("metal_id")).first()
        if metal is None:
            return _json_error("Valid metal_id is required.")

        karat = None
        if data.get("karat_id"):
            karat = JewelryKarat.objects.filter(company=company, id=data.get("karat_id")).first()
            if karat is None:
                return _json_error("Valid karat_id is required.")

        try:
            rate = create_gold_rate(
                company=company,
                metal=metal,
                karat=karat,
                rate_date=data.get("rate_date") or None,
                buying_price_per_gram=data.get("buying_price_per_gram", "0"),
                selling_price_per_gram=data.get("selling_price_per_gram", "0"),
                currency=data.get("currency", "SAR"),
                status=data.get("status", "active"),
                source=data.get("source", "") or "",
                notes=data.get("notes", "") or "",
            )
        except Exception as exc:
            return _json_error("Unable to create jewelry gold rate.", details=str(exc))
        return JsonResponse({"ok": True, "gold_rate": gold_rate_payload(rate)}, status=201)

    qs = (
        JewelryGoldRate.objects.filter(company=company)
        .select_related("metal", "karat")
        .order_by("-rate_date", "-id")[:200]
    )
    return JsonResponse({"ok": True, "results": [gold_rate_payload(obj) for obj in qs]})


@require_http_methods(["GET", "POST"])
def items_view(request):
    company, error = _require_company(request)
    if error:
        return error

    if request.method == "POST":
        data = _request_data(request)
        metal = JewelryMetal.objects.filter(company=company, id=data.get("metal_id")).first()
        if metal is None:
            return _json_error("Valid metal_id is required.")

        karat = None
        if data.get("karat_id"):
            karat = JewelryKarat.objects.filter(company=company, id=data.get("karat_id")).first()
            if karat is None:
                return _json_error("Valid karat_id is required.")

        try:
            item = JewelryItem.objects.create(
                company=company,
                sku=str(data.get("sku", "")).strip(),
                name=str(data.get("name", "")).strip(),
                metal=metal,
                karat=karat,
                catalog_item_id=data.get("catalog_item_id") or None,
                inventory_item_id=data.get("inventory_item_id") or None,
                gross_weight=Decimal(str(data.get("gross_weight", "0"))),
                stone_weight=Decimal(str(data.get("stone_weight", "0"))),
                net_gold_weight=Decimal(str(data.get("net_gold_weight", "0"))),
                making_charge_type=data.get("making_charge_type", JewelryMakingChargeType.PER_GRAM),
                making_charge_value=Decimal(str(data.get("making_charge_value", "0"))),
                stone_value=Decimal(str(data.get("stone_value", "0"))),
                other_charges=Decimal(str(data.get("other_charges", "0"))),
                vat_rate=Decimal(str(data.get("vat_rate", "15.0000"))),
                status=data.get("status", "active"),
                notes=data.get("notes", "") or "",
            )
        except Exception as exc:
            return _json_error("Unable to create jewelry item.", details=str(exc))
        return JsonResponse({"ok": True, "item": jewelry_item_payload(item)}, status=201)

    qs = (
        JewelryItem.objects.filter(company=company)
        .select_related("metal", "karat", "last_gold_rate")
        .order_by("sku")[:200]
    )
    return JsonResponse({"ok": True, "results": [jewelry_item_payload(obj) for obj in qs]})


@require_http_methods(["GET"])
def item_detail_view(request, item_id):
    company, error = _require_company(request)
    if error:
        return error

    item = (
        JewelryItem.objects.filter(company=company, id=item_id)
        .select_related("metal", "karat", "last_gold_rate")
        .first()
    )
    if item is None:
        return _json_error("Jewelry item not found.", status=404)
    return JsonResponse({"ok": True, "item": jewelry_item_payload(item)})


@require_http_methods(["POST"])
def price_item_view(request, item_id):
    company, error = _require_company(request)
    if error:
        return error

    item = (
        JewelryItem.objects.filter(company=company, id=item_id)
        .select_related("metal", "karat")
        .first()
    )
    if item is None:
        return _json_error("Jewelry item not found.", status=404)

    try:
        estimate = price_jewelry_item(item, save=True)
    except Exception as exc:
        return _json_error("Unable to price jewelry item.", details=str(exc))

    return JsonResponse({"ok": True, "estimate": estimate, "item": jewelry_item_payload(item)})


@require_http_methods(["POST"])
def estimate_view(request):
    data = _request_data(request)
    try:
        estimate = estimate_jewelry_price(
            net_gold_weight=data.get("net_gold_weight", "0"),
            gold_price_per_gram=data.get("gold_price_per_gram", "0"),
            making_charge_type=data.get("making_charge_type", JewelryMakingChargeType.PER_GRAM),
            making_charge_value=data.get("making_charge_value", "0"),
            stone_value=data.get("stone_value", "0"),
            other_charges=data.get("other_charges", "0"),
            vat_rate=data.get("vat_rate", "15.0000"),
        )
    except Exception as exc:
        return _json_error("Unable to estimate jewelry price.", details=str(exc))

    return JsonResponse({"ok": True, "estimate": estimate})


@require_http_methods(["GET"])
def summary_view(request):
    company, error = _require_company(request)
    if error:
        return error
    return JsonResponse({"ok": True, "summary": jewelry_summary_payload(company)})

