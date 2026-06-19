# ============================================================
# ًں“‚ activity_backends/tests.py
# ًں§  PrimeyAcc | Activity-Specific Backend Tests â€” Phase 25.3
# ============================================================
# âœ… Restaurant foundation tests
# âœ… Clinic foundation tests
# âœ… Project foundation tests
# âœ… Summary and API smoke tests
# ============================================================

from __future__ import annotations

from decimal import Decimal

from django.test import TestCase
from django.utils import timezone

from companies.models import Company

from .models import (
    ClinicAppointment,
    ClinicPatient,
    ClinicService,
    Project,
    ProjectCostLine,
    ProjectWorkOrder,
    RestaurantKitchenOrder,
    RestaurantMenuItem,
)
from .services import (
    activity_backends_summary,
    create_clinic_appointment,
    create_clinic_patient,
    create_clinic_service,
    create_project,
    create_project_cost_line,
    create_project_work_order,
    create_restaurant_category,
    create_restaurant_kitchen_order,
    create_restaurant_menu_item,
    create_restaurant_table,
    seed_activity_backends_foundation,
)


class ActivityBackendsPhase253Tests(TestCase):
    def setUp(self):
        self.company = Company.objects.create(name="Primey Activity Co")

    def test_seed_activity_foundation(self):
        result = seed_activity_backends_foundation(self.company)

        self.assertEqual(result["summary"]["restaurant"]["menu_categories"], 1)
        self.assertEqual(result["summary"]["restaurant"]["tables"], 1)
        self.assertEqual(result["summary"]["clinic"]["services"], 1)
        self.assertEqual(result["summary"]["projects"]["projects"], 1)

    def test_restaurant_kitchen_order_totals(self):
        category = create_restaurant_category(
            company=self.company,
            data={"code": "DRINKS", "name": "Drinks"},
        )
        menu_item = create_restaurant_menu_item(
            company=self.company,
            data={
                "category_id": category.id,
                "code": "COFFEE",
                "name": "Coffee",
                "price": "10.00",
                "tax_rate": "15.00",
                "kitchen_station": "BAR",
            },
        )
        table = create_restaurant_table(
            company=self.company,
            data={"code": "T-10", "name": "Table 10", "capacity": 2},
        )
        order = create_restaurant_kitchen_order(
            company=self.company,
            data={
                "table_id": table.id,
                "items": [
                    {
                        "menu_item_id": menu_item.id,
                        "quantity": "2",
                    }
                ],
            },
        )

        self.assertEqual(RestaurantKitchenOrder.objects.count(), 1)
        self.assertEqual(str(order.subtotal), "20.00")
        self.assertEqual(str(order.tax_amount), "3.00")
        self.assertEqual(str(order.total_amount), "23.00")

    def test_clinic_patient_service_appointment(self):
        patient = create_clinic_patient(
            company=self.company,
            data={
                "full_name": "Patient One",
                "mobile": "0500000000",
            },
        )
        service = create_clinic_service(
            company=self.company,
            data={
                "code": "DENTAL",
                "name": "Dental Consultation",
                "department": "Dental",
                "price": "150.00",
            },
        )
        appointment = create_clinic_appointment(
            company=self.company,
            data={
                "patient_id": patient.id,
                "service_id": service.id,
                "appointment_at": timezone.now().isoformat(),
                "practitioner_name": "Dr. Prime",
            },
        )

        self.assertEqual(ClinicPatient.objects.count(), 1)
        self.assertEqual(ClinicService.objects.count(), 1)
        self.assertEqual(ClinicAppointment.objects.count(), 1)
        self.assertEqual(str(appointment.price_snapshot), "150.00")

    def test_project_cost_rollup(self):
        project = create_project(
            company=self.company,
            data={
                "name": "Villa Project",
                "budget_amount": "100000.00",
                "status": "ACTIVE",
            },
        )
        work_order = create_project_work_order(
            company=self.company,
            data={
                "project_id": project.id,
                "title": "Foundation Work",
                "estimated_amount": "20000.00",
            },
        )
        cost_line = create_project_cost_line(
            company=self.company,
            data={
                "project_id": project.id,
                "work_order_id": work_order.id,
                "cost_type": "MATERIAL",
                "description": "Concrete",
                "quantity": "10",
                "unit_cost": "250.00",
            },
        )

        project.refresh_from_db()

        self.assertEqual(Project.objects.count(), 1)
        self.assertEqual(ProjectWorkOrder.objects.count(), 1)
        self.assertEqual(ProjectCostLine.objects.count(), 1)
        self.assertEqual(str(cost_line.total_cost), "2500.00")
        self.assertEqual(str(project.actual_cost_amount), "2500.00")

    def test_summary_counts_all_activity_scopes(self):
        seed_activity_backends_foundation(self.company)
        summary = activity_backends_summary(self.company)

        self.assertIn("restaurant", summary)
        self.assertIn("clinic", summary)
        self.assertIn("projects", summary)
        self.assertEqual(summary["restaurant"]["menu_categories"], 1)
        self.assertEqual(summary["clinic"]["services"], 1)
        self.assertEqual(summary["projects"]["projects"], 1)
