from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal
from typing import Any

from django.contrib.auth.decorators import login_required
from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncDate
from django.http import HttpRequest, JsonResponse
from django.utils import timezone
from django.utils.dateparse import parse_date
from django.views.decorators.http import require_GET

from api.permissions import user_has_system_permission
from api.system.platform_reports.views import _build_report
from billing.models import (
    PlatformSubscriptionAdjustment,
    PlatformSubscriptionPayment,
    PlatformSubscriptionRefund,
)
from subscriptions.models import CompanySubscription


DASHBOARD_PERMISSION = "system.dashboard.view"
MAX_RANGE_DAYS = 366
ZERO = Decimal("0.00")


def _money(value: Any) -> Decimal:
    try:
        return Decimal(str(value or "0.00")).quantize(Decimal("0.01"))
    except Exception:
        return ZERO


def _money_string(value: Any) -> str:
    return f"{_money(value):.2f}"


def _parse_period(request: HttpRequest) -> tuple[date, date] | JsonResponse:
    today = timezone.localdate()
    raw_from = str(request.GET.get("date_from") or "").strip()
    raw_to = str(request.GET.get("date_to") or "").strip()

    date_to = parse_date(raw_to) if raw_to else today
    date_from = parse_date(raw_from) if raw_from else date_to - timedelta(days=27)

    if date_from is None or date_to is None:
        return JsonResponse(
            {"ok": False, "code": "INVALID_DASHBOARD_DATE", "message": "Invalid dashboard date."},
            status=400,
        )

    if date_from > date_to:
        return JsonResponse(
            {"ok": False, "code": "INVALID_DASHBOARD_DATE_RANGE", "message": "date_from must not be after date_to."},
            status=400,
        )

    if (date_to - date_from).days + 1 > MAX_RANGE_DAYS:
        return JsonResponse(
            {"ok": False, "code": "DASHBOARD_DATE_RANGE_TOO_LARGE", "message": "Dashboard range cannot exceed 366 days."},
            status=400,
        )

    return date_from, date_to


def _filters(date_from: date, date_to: date) -> dict[str, Any]:
    return {
        "date_from": date_from,
        "date_to": date_to,
        "company_id": None,
        "plan_id": None,
        "gateway": "",
        "payment_method": "",
    }


def _change(current: Any, previous: Any) -> dict[str, Any]:
    current_value = _money(current)
    previous_value = _money(previous)
    delta = current_value - previous_value

    if delta > ZERO:
        direction = "up"
    elif delta < ZERO:
        direction = "down"
    else:
        direction = "stable"

    if previous_value == ZERO:
        percent = 0.0 if current_value == ZERO else None
    else:
        percent = round(float((delta / abs(previous_value)) * Decimal("100")), 1)

    return {
        "current": _money_string(current_value),
        "previous": _money_string(previous_value),
        "delta": _money_string(delta),
        "change_percent": percent,
        "direction": direction,
    }


def _count_change(current: int, previous: int) -> dict[str, Any]:
    delta = int(current) - int(previous)
    if delta > 0:
        direction = "up"
    elif delta < 0:
        direction = "down"
    else:
        direction = "stable"
    if previous == 0:
        percent = 0.0 if current == 0 else None
    else:
        percent = round(((current - previous) / abs(previous)) * 100.0, 1)
    return {
        "current": int(current),
        "previous": int(previous),
        "delta": delta,
        "change_percent": percent,
        "direction": direction,
    }


def _subscription_sums(date_from: date, date_to: date) -> dict[str, Decimal]:
    values = (
        CompanySubscription.objects.filter(created_at__date__range=(date_from, date_to))
        .aggregate(value=Sum("total_amount"), tax=Sum("tax_amount"))
    )
    return {
        "value": _money(values.get("value")),
        "tax": _money(values.get("tax")),
    }


def _dict_by_day(rows: Any, value_key: str = "total") -> dict[date, Decimal]:
    result: dict[date, Decimal] = {}
    for row in rows:
        day = row.get("day")
        if day:
            result[day] = _money(row.get(value_key))
    return result


def _daily_series(date_from: date, date_to: date) -> list[dict[str, Any]]:
    gross = _dict_by_day(
        PlatformSubscriptionPayment.objects.filter(
            status=PlatformSubscriptionPayment.Status.PAID,
            paid_at__date__range=(date_from, date_to),
        )
        .annotate(day=TruncDate("paid_at"))
        .values("day")
        .annotate(total=Sum("amount"))
        .order_by("day")
    )
    refunds = _dict_by_day(
        PlatformSubscriptionRefund.objects.filter(
            status=PlatformSubscriptionRefund.Status.SUCCEEDED,
            refunded_at__date__range=(date_from, date_to),
        )
        .annotate(day=TruncDate("refunded_at"))
        .values("day")
        .annotate(total=Sum("amount"))
        .order_by("day")
    )
    adjustment_rows = (
        PlatformSubscriptionAdjustment.objects.filter(
            status=PlatformSubscriptionAdjustment.Status.POSTED,
            posted_at__date__range=(date_from, date_to),
        )
        .annotate(day=TruncDate("posted_at"))
        .values("day")
        .annotate(
            debits=Sum(
                "amount",
                filter=Q(adjustment_type=PlatformSubscriptionAdjustment.AdjustmentType.DEBIT),
            ),
            credits=Sum(
                "amount",
                filter=Q(adjustment_type=PlatformSubscriptionAdjustment.AdjustmentType.CREDIT),
            ),
        )
        .order_by("day")
    )
    adjustments: dict[date, Decimal] = {}
    for row in adjustment_rows:
        if row.get("day"):
            adjustments[row["day"]] = _money(row.get("debits")) - _money(row.get("credits"))

    subscription_values = _dict_by_day(
        CompanySubscription.objects.filter(created_at__date__range=(date_from, date_to))
        .annotate(day=TruncDate("created_at"))
        .values("day")
        .annotate(total=Sum("total_amount"))
        .order_by("day")
    )

    result: list[dict[str, Any]] = []
    cursor = date_from
    while cursor <= date_to:
        gross_value = gross.get(cursor, ZERO)
        refund_value = refunds.get(cursor, ZERO)
        adjustment_value = adjustments.get(cursor, ZERO)
        net_value = gross_value - refund_value + adjustment_value
        result.append(
            {
                "date": cursor.isoformat(),
                "gross_paid": _money_string(gross_value),
                "net_collected": _money_string(net_value),
                "subscription_value": _money_string(subscription_values.get(cursor, ZERO)),
            }
        )
        cursor += timedelta(days=1)
    return result


def _top_plans(date_from: date, date_to: date) -> list[dict[str, Any]]:
    rows = (
        CompanySubscription.objects.filter(created_at__date__range=(date_from, date_to))
        .values("plan_id", "plan__name", "plan__code")
        .annotate(subscriptions=Count("id"), subscription_value=Sum("total_amount"))
        .order_by("-subscriptions", "-subscription_value", "plan_id")[:6]
    )
    return [
        {
            "plan_id": row["plan_id"],
            "name": row["plan__name"] or "",
            "code": row["plan__code"] or "",
            "subscriptions": int(row["subscriptions"] or 0),
            "subscription_value": _money_string(row["subscription_value"]),
        }
        for row in rows
    ]


def _status_events(date_from: date, date_to: date) -> dict[str, int]:
    return {
        "new": CompanySubscription.objects.filter(
            action=CompanySubscription.SubscriptionAction.NEW,
            created_at__date__range=(date_from, date_to),
        ).count(),
        "renewals": CompanySubscription.objects.filter(
            action=CompanySubscription.SubscriptionAction.RENEWAL,
            created_at__date__range=(date_from, date_to),
        ).count(),
        "activated": CompanySubscription.objects.filter(
            activated_at__date__range=(date_from, date_to),
        ).count(),
        "expired": CompanySubscription.objects.filter(
            status=CompanySubscription.Status.EXPIRED,
            end_date__range=(date_from, date_to),
        ).count(),
    }


@login_required
@require_GET
def system_dashboard_analytics(request: HttpRequest) -> JsonResponse:
    if not user_has_system_permission(request.user, DASHBOARD_PERMISSION):
        return JsonResponse(
            {"ok": False, "code": "SYSTEM_DASHBOARD_PERMISSION_REQUIRED", "message": "You are not authorized to view the system dashboard."},
            status=403,
        )

    period = _parse_period(request)
    if isinstance(period, JsonResponse):
        return period
    date_from, date_to = period
    days = (date_to - date_from).days + 1
    previous_to = date_from - timedelta(days=1)
    previous_from = previous_to - timedelta(days=days - 1)

    current_report = _build_report(_filters(date_from, date_to))
    previous_report = _build_report(_filters(previous_from, previous_to))
    current_revenue = current_report["revenue"]
    previous_revenue = previous_report["revenue"]
    current_sub = _subscription_sums(date_from, date_to)
    previous_sub = _subscription_sums(previous_from, previous_to)

    current_events = _status_events(date_from, date_to)
    previous_events = _status_events(previous_from, previous_to)

    series = _daily_series(date_from, date_to)
    net_total = sum((_money(row["net_collected"]) for row in series), ZERO)
    subscription_total = sum((_money(row["subscription_value"]) for row in series), ZERO)

    return JsonResponse(
        {
            "ok": True,
            "data": {
                "period": {
                    "date_from": date_from.isoformat(),
                    "date_to": date_to.isoformat(),
                    "days": days,
                    "previous_date_from": previous_from.isoformat(),
                    "previous_date_to": previous_to.isoformat(),
                },
                "financial_cards": {
                    "net_collected": _change(current_revenue["net_collected"], previous_revenue["net_collected"]),
                    "gross_paid": _change(current_revenue["gross_paid"], previous_revenue["gross_paid"]),
                    "successful_refunds": _change(current_revenue["successful_refunds"], previous_revenue["successful_refunds"]),
                    "subscription_tax": _change(current_sub["tax"], previous_sub["tax"]),
                },
                "chart": {
                    "series": series,
                    "totals": {
                        "net_collected": _money_string(net_total),
                        "subscription_value": _money_string(subscription_total),
                    },
                    "default_series": "subscription_value" if net_total == ZERO and subscription_total != ZERO else "net_collected",
                },
                "top_plans": _top_plans(date_from, date_to),
                "subscription_events": {
                    key: _count_change(current_events[key], previous_events[key])
                    for key in ("new", "renewals", "activated", "expired")
                },
                "meta": {
                    "currency_code": "SAR",
                    "comparison": "previous_equal_period",
                    "read_only": True,
                },
            },
        }
    )


system_dashboard_analytics.required_system_permissions = [DASHBOARD_PERMISSION]
