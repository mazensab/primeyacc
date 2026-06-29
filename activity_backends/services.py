# ============================================================
# ًں“‚ activity_backends/services.py
# ًں§  Mhamcloud | Activity-Specific Backend Services â€” Phase 25.3
# ============================================================
# âœ… Restaurant summary, payloads and kitchen order creation
# âœ… Clinic summary, payloads and appointment creation
# âœ… Project summary, payloads and cost tracking
# âœ… Company-scoped service layer
# ============================================================
# ط§ظ„ظ‚ط§ط¹ط¯ط© ط§ظ„ظ…ط¹طھظ…ط¯ط©:
# - ط§ظ„ط®ط¯ظ…ط§طھ ظ‡ظٹ ظ…طµط¯ط± ظ…ظ†ط·ظ‚ ط§ظ„ظ†ط´ط§ط·ط§طھ ط§ظ„ظ…طھط®طµطµط©.
# - ط§ظ„ط´ط±ظƒط© طھط£طھظٹ ظ…ظ† context ظˆظ„ط§ طھط¤ط®ط° ظ…ظ† ط§ظ„ظˆط§ط¬ظ‡ط©.
# - ظ„ط§ ظ†ظƒط±ط± ظ…ظ†ط·ظ‚ core apps.
# ============================================================

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Count, Sum
from django.utils import timezone

from .models import (
    MONEY_ZERO,
    ClinicAppointment,
    ClinicAppointmentStatus,
    ClinicPatient,
    ClinicService,
    Project,
    ProjectCostLine,
    ProjectStatus,
    ProjectWorkOrder,
    RestaurantKitchenOrder,
    RestaurantKitchenOrderItem,
    RestaurantKitchenOrderStatus,
    RestaurantMenuCategory,
    RestaurantMenuItem,
    RestaurantTable,
    RestaurantTableStatus,
    quant_money,
)


def normalize_text(value: Any) -> str:
    return str(value or "").strip()


def normalize_code(value: Any) -> str:
    return normalize_text(value).upper()


def normalize_decimal(value: Any, default: Decimal = Decimal("0.00")) -> Decimal:
    if value in [None, ""]:
        return default
    return Decimal(str(value))


def normalize_date(value: Any, *, default_today: bool = False) -> date | None:
    if value in [None, ""]:
        return timezone.localdate() if default_today else None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        return date.fromisoformat(value.strip())
    raise ValidationError("Invalid date value.")


def normalize_datetime(value: Any, *, default_now: bool = False):
    if value in [None, ""]:
        return timezone.now() if default_now else None
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        parsed = datetime.fromisoformat(value.strip())
        if timezone.is_naive(parsed):
            parsed = timezone.make_aware(parsed, timezone.get_current_timezone())
        return parsed
    raise ValidationError("Invalid datetime value.")


def _next_number(model, company, field_name: str, prefix: str) -> str:
    today = timezone.localdate()
    date_part = today.strftime("%Y%m%d")
    starts_with = f"{prefix}-{date_part}-"
    last_obj = (
        model.objects.filter(
            company=company,
            **{f"{field_name}__startswith": starts_with},
        )
        .order_by(f"-{field_name}", "-id")
        .first()
    )
    next_no = 1
    if last_obj:
        try:
            next_no = int(str(getattr(last_obj, field_name)).split("-")[-1]) + 1
        except (TypeError, ValueError):
            next_no = last_obj.id + 1
    return f"{starts_with}{next_no:06d}"


def restaurant_category_payload(obj: RestaurantMenuCategory) -> dict[str, Any]:
    return {
        "id": obj.id,
        "company_id": obj.company_id,
        "code": obj.code,
        "name": obj.name,
        "name_ar": obj.name_ar,
        "name_en": obj.name_en,
        "display_name": obj.display_name,
        "is_active": obj.is_active,
        "sort_order": obj.sort_order,
        "notes": obj.notes,
        "extra_data": obj.extra_data or {},
    }


def restaurant_menu_item_payload(obj: RestaurantMenuItem) -> dict[str, Any]:
    return {
        "id": obj.id,
        "company_id": obj.company_id,
        "category_id": obj.category_id,
        "category_name": obj.category.display_name if obj.category_id else "",
        "catalog_item_id": obj.catalog_item_id,
        "code": obj.code,
        "name": obj.name,
        "name_ar": obj.name_ar,
        "name_en": obj.name_en,
        "display_name": obj.display_name,
        "description": obj.description,
        "price": str(obj.price),
        "taxable": obj.taxable,
        "tax_rate": str(obj.tax_rate),
        "kitchen_station": obj.kitchen_station,
        "is_available": obj.is_available,
        "sort_order": obj.sort_order,
        "notes": obj.notes,
        "extra_data": obj.extra_data or {},
    }


def restaurant_table_payload(obj: RestaurantTable) -> dict[str, Any]:
    return {
        "id": obj.id,
        "company_id": obj.company_id,
        "code": obj.code,
        "name": obj.name,
        "area": obj.area,
        "capacity": obj.capacity,
        "status": obj.status,
        "is_active": obj.is_active,
        "notes": obj.notes,
        "extra_data": obj.extra_data or {},
    }


def restaurant_kitchen_order_payload(obj: RestaurantKitchenOrder, include_items: bool = False) -> dict[str, Any]:
    data = {
        "id": obj.id,
        "company_id": obj.company_id,
        "table_id": obj.table_id,
        "table_code": obj.table.code if obj.table_id else "",
        "order_number": obj.order_number,
        "order_date": obj.order_date.isoformat() if obj.order_date else None,
        "status": obj.status,
        "subtotal": str(obj.subtotal),
        "tax_amount": str(obj.tax_amount),
        "total_amount": str(obj.total_amount),
        "notes": obj.notes,
        "extra_data": obj.extra_data or {},
    }
    if include_items:
        data["items"] = [
            {
                "id": line.id,
                "menu_item_id": line.menu_item_id,
                "line_number": line.line_number,
                "item_name": line.item_name_snapshot,
                "quantity": str(line.quantity),
                "unit_price": str(line.unit_price),
                "line_subtotal": str(line.line_subtotal),
                "tax_rate": str(line.tax_rate),
                "tax_amount": str(line.tax_amount),
                "line_total": str(line.line_total),
                "notes": line.notes,
            }
            for line in obj.items.select_related("menu_item").order_by("line_number", "id")
        ]
    return data


@transaction.atomic
def create_restaurant_category(*, company, data: dict[str, Any]) -> RestaurantMenuCategory:
    obj = RestaurantMenuCategory(
        company=company,
        code=normalize_code(data.get("code")),
        name=normalize_text(data.get("name")),
        name_ar=normalize_text(data.get("name_ar")),
        name_en=normalize_text(data.get("name_en")),
        is_active=bool(data.get("is_active", True)),
        sort_order=int(data.get("sort_order") or 0),
        notes=normalize_text(data.get("notes")),
        extra_data=data.get("extra_data") if isinstance(data.get("extra_data"), dict) else {},
    )
    obj.full_clean()
    obj.save()
    return obj


@transaction.atomic
def create_restaurant_menu_item(*, company, data: dict[str, Any]) -> RestaurantMenuItem:
    category = None
    if data.get("category_id"):
        category = RestaurantMenuCategory.objects.filter(company=company, id=data.get("category_id")).first()
        if category is None:
            raise ValidationError("Category was not found for this company.")
    obj = RestaurantMenuItem(
        company=company,
        category=category,
        catalog_item_id=data.get("catalog_item_id") or None,
        code=normalize_code(data.get("code")),
        name=normalize_text(data.get("name")),
        name_ar=normalize_text(data.get("name_ar")),
        name_en=normalize_text(data.get("name_en")),
        description=normalize_text(data.get("description")),
        price=normalize_decimal(data.get("price"), MONEY_ZERO),
        taxable=bool(data.get("taxable", True)),
        tax_rate=normalize_decimal(data.get("tax_rate"), Decimal("15.00")),
        kitchen_station=normalize_text(data.get("kitchen_station")),
        is_available=bool(data.get("is_available", True)),
        sort_order=int(data.get("sort_order") or 0),
        notes=normalize_text(data.get("notes")),
        extra_data=data.get("extra_data") if isinstance(data.get("extra_data"), dict) else {},
    )
    obj.full_clean()
    obj.save()
    return obj


@transaction.atomic
def create_restaurant_table(*, company, data: dict[str, Any]) -> RestaurantTable:
    obj = RestaurantTable(
        company=company,
        code=normalize_code(data.get("code")),
        name=normalize_text(data.get("name")),
        area=normalize_text(data.get("area")),
        capacity=int(data.get("capacity") or 1),
        status=data.get("status") or RestaurantTableStatus.AVAILABLE,
        is_active=bool(data.get("is_active", True)),
        notes=normalize_text(data.get("notes")),
        extra_data=data.get("extra_data") if isinstance(data.get("extra_data"), dict) else {},
    )
    obj.full_clean()
    obj.save()
    return obj


@transaction.atomic
def create_restaurant_kitchen_order(*, company, data: dict[str, Any]) -> RestaurantKitchenOrder:
    table = None
    if data.get("table_id"):
        table = RestaurantTable.objects.filter(company=company, id=data.get("table_id")).first()
        if table is None:
            raise ValidationError("Table was not found for this company.")

    items = data.get("items") or []
    if not isinstance(items, list) or not items:
        raise ValidationError({"items": "At least one kitchen order item is required."})

    order = RestaurantKitchenOrder(
        company=company,
        table=table,
        order_number=normalize_code(data.get("order_number")) or _next_number(RestaurantKitchenOrder, company, "order_number", "KOT"),
        status=data.get("status") or RestaurantKitchenOrderStatus.DRAFT,
        notes=normalize_text(data.get("notes")),
        extra_data=data.get("extra_data") if isinstance(data.get("extra_data"), dict) else {},
    )
    order.full_clean()
    order.save()

    for index, raw in enumerate(items, start=1):
        menu_item = RestaurantMenuItem.objects.filter(company=company, id=raw.get("menu_item_id")).first()
        if menu_item is None:
            raise ValidationError({"menu_item": "Menu item was not found for this company."})
        line = RestaurantKitchenOrderItem(
            kitchen_order=order,
            company=company,
            menu_item=menu_item,
            line_number=int(raw.get("line_number") or index),
            quantity=normalize_decimal(raw.get("quantity"), Decimal("1.0000")),
            notes=normalize_text(raw.get("notes")),
            extra_data=raw.get("extra_data") if isinstance(raw.get("extra_data"), dict) else {},
        )
        line.save()

    order.recalculate_totals(save=True)
    return order


def clinic_patient_payload(obj: ClinicPatient) -> dict[str, Any]:
    return {
        "id": obj.id,
        "company_id": obj.company_id,
        "patient_number": obj.patient_number,
        "full_name": obj.full_name,
        "mobile": obj.mobile,
        "email": obj.email,
        "national_id": obj.national_id,
        "date_of_birth": obj.date_of_birth.isoformat() if obj.date_of_birth else None,
        "gender": obj.gender,
        "notes": obj.notes,
        "extra_data": obj.extra_data or {},
    }


def clinic_service_payload(obj: ClinicService) -> dict[str, Any]:
    return {
        "id": obj.id,
        "company_id": obj.company_id,
        "catalog_item_id": obj.catalog_item_id,
        "code": obj.code,
        "name": obj.name,
        "department": obj.department,
        "duration_minutes": obj.duration_minutes,
        "price": str(obj.price),
        "taxable": obj.taxable,
        "tax_rate": str(obj.tax_rate),
        "is_active": obj.is_active,
        "notes": obj.notes,
        "extra_data": obj.extra_data or {},
    }


def clinic_appointment_payload(obj: ClinicAppointment) -> dict[str, Any]:
    return {
        "id": obj.id,
        "company_id": obj.company_id,
        "patient_id": obj.patient_id,
        "patient_name": obj.patient.full_name,
        "service_id": obj.service_id,
        "service_name": obj.service.name,
        "appointment_number": obj.appointment_number,
        "appointment_at": obj.appointment_at.isoformat() if obj.appointment_at else None,
        "practitioner_name": obj.practitioner_name,
        "status": obj.status,
        "price_snapshot": str(obj.price_snapshot),
        "notes": obj.notes,
        "extra_data": obj.extra_data or {},
    }


@transaction.atomic
def create_clinic_patient(*, company, data: dict[str, Any]) -> ClinicPatient:
    obj = ClinicPatient(
        company=company,
        patient_number=normalize_code(data.get("patient_number")) or _next_number(ClinicPatient, company, "patient_number", "PAT"),
        full_name=normalize_text(data.get("full_name") or data.get("name")),
        mobile=normalize_text(data.get("mobile")),
        email=normalize_text(data.get("email")),
        national_id=normalize_text(data.get("national_id")),
        date_of_birth=normalize_date(data.get("date_of_birth")),
        gender=normalize_text(data.get("gender")),
        notes=normalize_text(data.get("notes")),
        extra_data=data.get("extra_data") if isinstance(data.get("extra_data"), dict) else {},
    )
    obj.full_clean()
    obj.save()
    return obj


@transaction.atomic
def create_clinic_service(*, company, data: dict[str, Any]) -> ClinicService:
    obj = ClinicService(
        company=company,
        catalog_item_id=data.get("catalog_item_id") or None,
        code=normalize_code(data.get("code")),
        name=normalize_text(data.get("name")),
        department=normalize_text(data.get("department")),
        duration_minutes=int(data.get("duration_minutes") or 30),
        price=normalize_decimal(data.get("price"), MONEY_ZERO),
        taxable=bool(data.get("taxable", True)),
        tax_rate=normalize_decimal(data.get("tax_rate"), Decimal("15.00")),
        is_active=bool(data.get("is_active", True)),
        notes=normalize_text(data.get("notes")),
        extra_data=data.get("extra_data") if isinstance(data.get("extra_data"), dict) else {},
    )
    obj.full_clean()
    obj.save()
    return obj


@transaction.atomic
def create_clinic_appointment(*, company, data: dict[str, Any]) -> ClinicAppointment:
    patient = ClinicPatient.objects.filter(company=company, id=data.get("patient_id")).first()
    if patient is None:
        raise ValidationError("Patient was not found for this company.")
    service = ClinicService.objects.filter(company=company, id=data.get("service_id")).first()
    if service is None:
        raise ValidationError("Service was not found for this company.")

    obj = ClinicAppointment(
        company=company,
        patient=patient,
        service=service,
        appointment_number=normalize_code(data.get("appointment_number")) or _next_number(ClinicAppointment, company, "appointment_number", "APT"),
        appointment_at=normalize_datetime(data.get("appointment_at"), default_now=True),
        practitioner_name=normalize_text(data.get("practitioner_name")),
        status=data.get("status") or ClinicAppointmentStatus.SCHEDULED,
        price_snapshot=normalize_decimal(data.get("price_snapshot"), service.price),
        notes=normalize_text(data.get("notes")),
        extra_data=data.get("extra_data") if isinstance(data.get("extra_data"), dict) else {},
    )
    obj.full_clean()
    obj.save()
    return obj


def project_payload(obj: Project) -> dict[str, Any]:
    return {
        "id": obj.id,
        "company_id": obj.company_id,
        "project_number": obj.project_number,
        "name": obj.name,
        "customer_id": obj.customer_id,
        "status": obj.status,
        "start_date": obj.start_date.isoformat() if obj.start_date else None,
        "end_date": obj.end_date.isoformat() if obj.end_date else None,
        "budget_amount": str(obj.budget_amount),
        "actual_cost_amount": str(obj.actual_cost_amount),
        "notes": obj.notes,
        "extra_data": obj.extra_data or {},
    }


def project_work_order_payload(obj: ProjectWorkOrder) -> dict[str, Any]:
    return {
        "id": obj.id,
        "company_id": obj.company_id,
        "project_id": obj.project_id,
        "project_number": obj.project.project_number,
        "work_order_number": obj.work_order_number,
        "title": obj.title,
        "status": obj.status,
        "scheduled_start": obj.scheduled_start.isoformat() if obj.scheduled_start else None,
        "scheduled_end": obj.scheduled_end.isoformat() if obj.scheduled_end else None,
        "estimated_amount": str(obj.estimated_amount),
        "notes": obj.notes,
        "extra_data": obj.extra_data or {},
    }


def project_cost_line_payload(obj: ProjectCostLine) -> dict[str, Any]:
    return {
        "id": obj.id,
        "company_id": obj.company_id,
        "project_id": obj.project_id,
        "work_order_id": obj.work_order_id,
        "cost_type": obj.cost_type,
        "description": obj.description,
        "quantity": str(obj.quantity),
        "unit_cost": str(obj.unit_cost),
        "total_cost": str(obj.total_cost),
        "cost_date": obj.cost_date.isoformat() if obj.cost_date else None,
        "notes": obj.notes,
        "extra_data": obj.extra_data or {},
    }


@transaction.atomic
def create_project(*, company, data: dict[str, Any]) -> Project:
    obj = Project(
        company=company,
        project_number=normalize_code(data.get("project_number")) or _next_number(Project, company, "project_number", "PRJ"),
        name=normalize_text(data.get("name")),
        customer_id=data.get("customer_id") or None,
        status=data.get("status") or ProjectStatus.DRAFT,
        start_date=normalize_date(data.get("start_date"), default_today=True),
        end_date=normalize_date(data.get("end_date")),
        budget_amount=normalize_decimal(data.get("budget_amount"), MONEY_ZERO),
        notes=normalize_text(data.get("notes")),
        extra_data=data.get("extra_data") if isinstance(data.get("extra_data"), dict) else {},
    )
    obj.full_clean()
    obj.save()
    return obj


@transaction.atomic
def create_project_work_order(*, company, data: dict[str, Any]) -> ProjectWorkOrder:
    project = Project.objects.filter(company=company, id=data.get("project_id")).first()
    if project is None:
        raise ValidationError("Project was not found for this company.")
    obj = ProjectWorkOrder(
        company=company,
        project=project,
        work_order_number=normalize_code(data.get("work_order_number")) or _next_number(ProjectWorkOrder, company, "work_order_number", "WO"),
        title=normalize_text(data.get("title")),
        status=data.get("status") or "DRAFT",
        scheduled_start=normalize_date(data.get("scheduled_start")),
        scheduled_end=normalize_date(data.get("scheduled_end")),
        estimated_amount=normalize_decimal(data.get("estimated_amount"), MONEY_ZERO),
        notes=normalize_text(data.get("notes")),
        extra_data=data.get("extra_data") if isinstance(data.get("extra_data"), dict) else {},
    )
    obj.full_clean()
    obj.save()
    return obj


@transaction.atomic
def create_project_cost_line(*, company, data: dict[str, Any]) -> ProjectCostLine:
    project = Project.objects.filter(company=company, id=data.get("project_id")).first()
    if project is None:
        raise ValidationError("Project was not found for this company.")

    work_order = None
    if data.get("work_order_id"):
        work_order = ProjectWorkOrder.objects.filter(
            company=company,
            project=project,
            id=data.get("work_order_id"),
        ).first()
        if work_order is None:
            raise ValidationError("Work order was not found for this project.")

    obj = ProjectCostLine(
        company=company,
        project=project,
        work_order=work_order,
        cost_type=normalize_code(data.get("cost_type") or "MATERIAL"),
        description=normalize_text(data.get("description")),
        quantity=normalize_decimal(data.get("quantity"), Decimal("1.0000")),
        unit_cost=normalize_decimal(data.get("unit_cost"), MONEY_ZERO),
        cost_date=normalize_date(data.get("cost_date"), default_today=True),
        notes=normalize_text(data.get("notes")),
        extra_data=data.get("extra_data") if isinstance(data.get("extra_data"), dict) else {},
    )
    obj.save()
    return obj


def activity_backends_summary(company) -> dict[str, Any]:
    restaurant_orders = RestaurantKitchenOrder.objects.filter(company=company)
    projects = Project.objects.filter(company=company)

    return {
        "company_id": company.id,
        "restaurant": {
            "menu_categories": RestaurantMenuCategory.objects.filter(company=company).count(),
            "menu_items": RestaurantMenuItem.objects.filter(company=company).count(),
            "available_menu_items": RestaurantMenuItem.objects.filter(company=company, is_available=True).count(),
            "tables": RestaurantTable.objects.filter(company=company).count(),
            "active_tables": RestaurantTable.objects.filter(company=company, is_active=True).count(),
            "kitchen_orders": restaurant_orders.count(),
            "open_kitchen_orders": restaurant_orders.exclude(
                status__in=[
                    RestaurantKitchenOrderStatus.SERVED,
                    RestaurantKitchenOrderStatus.CANCELLED,
                ]
            ).count(),
            "kitchen_order_total": str(quant_money(restaurant_orders.aggregate(total=Sum("total_amount")).get("total") or MONEY_ZERO)),
        },
        "clinic": {
            "patients": ClinicPatient.objects.filter(company=company).count(),
            "services": ClinicService.objects.filter(company=company).count(),
            "active_services": ClinicService.objects.filter(company=company, is_active=True).count(),
            "appointments": ClinicAppointment.objects.filter(company=company).count(),
            "scheduled_appointments": ClinicAppointment.objects.filter(company=company, status=ClinicAppointmentStatus.SCHEDULED).count(),
        },
        "projects": {
            "projects": projects.count(),
            "active_projects": projects.filter(status=ProjectStatus.ACTIVE).count(),
            "work_orders": ProjectWorkOrder.objects.filter(company=company).count(),
            "cost_lines": ProjectCostLine.objects.filter(company=company).count(),
            "budget_amount": str(quant_money(projects.aggregate(total=Sum("budget_amount")).get("total") or MONEY_ZERO)),
            "actual_cost_amount": str(quant_money(projects.aggregate(total=Sum("actual_cost_amount")).get("total") or MONEY_ZERO)),
        },
    }


@transaction.atomic
def seed_activity_backends_foundation(company) -> dict[str, Any]:
    category, _ = RestaurantMenuCategory.objects.get_or_create(
        company=company,
        code="FOOD",
        defaults={"name": "Food", "name_ar": "ط§ظ„ط£ط·ط¹ظ…ط©", "sort_order": 10},
    )
    table, _ = RestaurantTable.objects.get_or_create(
        company=company,
        code="T-001",
        defaults={"name": "Table 1", "area": "Main Hall", "capacity": 4},
    )
    clinic_service, _ = ClinicService.objects.get_or_create(
        company=company,
        code="CONSULT",
        defaults={"name": "Consultation", "department": "General", "price": Decimal("100.00")},
    )
    project, _ = Project.objects.get_or_create(
        company=company,
        project_number="PRJ-SEED",
        defaults={"name": "Sample Project", "status": ProjectStatus.DRAFT},
    )

    return {
        "restaurant_category": restaurant_category_payload(category),
        "restaurant_table": restaurant_table_payload(table),
        "clinic_service": clinic_service_payload(clinic_service),
        "project": project_payload(project),
        "summary": activity_backends_summary(company),
    }
