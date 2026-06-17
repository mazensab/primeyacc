# ============================================================
# 📂 inventory/tests.py
# 🧠 PrimeyAcc | Company Inventory Tests V2.7
# ------------------------------------------------------------
# ✅ Warehouse model/service tests
# ✅ Stock item balance tests
# ✅ Inventory locations and bins model tests
# ✅ Inventory location services tests
# ✅ Location hierarchy and tenant isolation tests
# ✅ Default operational location tests
# ✅ Inventory locations list/detail API tests
# ✅ Inventory locations create/update/status API tests
# ✅ API tenant isolation and frontend company_id rejection
# ✅ Location-aware stock services bridge tests
# ✅ Stock and movement location serializer tests
# ✅ Stock list location filter and search tests
# ✅ Stock detail location payload tests
# ✅ Automatic default stock location resolution tests
# ✅ Explicit stock location and tenant isolation tests
# ✅ Source and target location transfer tests
# ✅ True multi-location independent balance tests
# ✅ Location-specific issue and insufficiency protection
# ✅ Same-warehouse location transfer tests
# ✅ Independent location average cost tests
# ✅ Warehouse multi-location stock summary tests
# ✅ Company and item-level stock summary API tests
# ✅ Weighted average cost and inventory value tests
# ✅ Stock summary tenant isolation and filters
# ✅ Stock movement posting tests
# ✅ Phase 10.3 automatic accounting posting on stock movements
# ✅ Negative stock prevention
# ✅ Warehouse transfer foundation
# ✅ Tenant isolation validation
# ✅ Service-layer source of truth
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - كل بيانات المخزون مرتبطة بشركة واحدة فقط
# - المستودع يجب أن يتبع نفس الشركة
# - الصنف يجب أن يتبع نفس الشركة ويكون PRODUCT
# - الخدمات هي مصدر تطبيق أثر المخزون
# - يمنع الرصيد السالب
# - لا نربط المشتريات بالمخزون تلقائيًا في هذه المرحلة
# - Phase 10.3 يثبت أن حركة المخزون المرحلة تنشئ قيدًا محاسبيًا تلقائيًا بدون تكرار
# ============================================================

from __future__ import annotations

from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase
from django.urls import reverse

from accounts.models import (
    CompanyMembership,
    CompanyRole,
    MembershipStatus,
    UserProfile,
)
from accounting.models import JournalEntry, JournalEntryStatus
from rest_framework.test import APIClient
from catalog.models import CatalogItem, CatalogItemType, CatalogUnit
from companies.models import Branch, Company
from inventory.models import (
    QUANTITY_ZERO,
    InventoryLocation,
    InventoryLocationStatus,
    InventoryLocationType,
    StockItem,
    StockMovement,
    StockMovementDirection,
    StockMovementStatus,
    StockMovementType,
    Warehouse,
    WarehouseStatus,
    WarehouseType,
    quantize_money,
    quantize_quantity,
)
from api.company.inventory.movements.serializers import (
    serialize_stock_movement,
)
from api.company.inventory.stock.serializers import (
    serialize_stock_item,
)
from api.company.inventory.warehouses.serializers import (
    serialize_warehouse,
)
from inventory.services import (
    adjust_stock,
    build_inventory_location_payload,
    create_inventory_location,
    ensure_default_inventory_locations,
    get_active_warehouse_inventory_locations,
    get_company_inventory_locations,
    get_default_inventory_location,
    get_inventory_location_by_purpose,
    get_warehouse_inventory_locations,
    create_stock_movement,
    create_warehouse,
    get_active_company_warehouses,
    get_company_stock_items,
    get_company_stock_movements,
    get_company_warehouses,
    get_or_create_stock_item,
    issue_stock,
    post_stock_movement_to_accounting,
    receive_stock,
    set_inventory_location_status,
    set_warehouse_status,
    transfer_stock,
    update_inventory_location,
    update_warehouse,
    validate_inventory_location_for_company,
    validate_item_for_inventory,
    validate_warehouse_for_company,
)


User = get_user_model()


class InventoryTestBase(TestCase):
    """
    Shared inventory test data.
    """

    def setUp(self):
        self.user = User.objects.create_user(
            username="inventory-user",
            email="inventory@example.com",
            password="testpass123",
        )

        self.company = Company.objects.create(
            name="Primey Test Company",
            company_code="INV-TEST-001",
            is_active=True,
        )
        self.other_company = Company.objects.create(
            name="Other Company",
            company_code="INV-TEST-002",
            is_active=True,
        )

        self.branch = Branch.objects.create(
            company=self.company,
            name="Main Branch",
            branch_code="BR-001",
            is_default=True,
        )
        self.other_branch = Branch.objects.create(
            company=self.other_company,
            name="Other Branch",
            branch_code="BR-002",
            is_default=True,
        )

        self.unit = CatalogUnit.objects.create(
            company=self.company,
            code="PCS",
            name="Piece",
            symbol="pcs",
        )
        self.other_unit = CatalogUnit.objects.create(
            company=self.other_company,
            code="PCS",
            name="Piece",
            symbol="pcs",
        )

        self.product = CatalogItem.objects.create(
            company=self.company,
            unit=self.unit,
            item_type=CatalogItemType.PRODUCT,
            code="ITEM-001",
            sku="SKU-001",
            barcode="BAR-001",
            name="Inventory Product",
            purchase_price=Decimal("10.00"),
            cost_price=Decimal("10.00"),
            sale_price=Decimal("15.00"),
            track_inventory=True,
            is_purchasable=True,
            is_sellable=True,
        )
        self.second_product = CatalogItem.objects.create(
            company=self.company,
            unit=self.unit,
            item_type=CatalogItemType.PRODUCT,
            code="ITEM-002",
            sku="SKU-002",
            barcode="BAR-002",
            name="Second Product",
            purchase_price=Decimal("20.00"),
            cost_price=Decimal("20.00"),
            sale_price=Decimal("30.00"),
            track_inventory=True,
            is_purchasable=True,
            is_sellable=True,
        )
        self.service_item = CatalogItem.objects.create(
            company=self.company,
            unit=self.unit,
            item_type=CatalogItemType.SERVICE,
            code="SRV-001",
            sku="SRV-SKU-001",
            barcode="SRV-BAR-001",
            name="Service Item",
            purchase_price=Decimal("0.00"),
            cost_price=Decimal("0.00"),
            sale_price=Decimal("50.00"),
            track_inventory=False,
            is_purchasable=True,
            is_sellable=True,
        )
        self.other_product = CatalogItem.objects.create(
            company=self.other_company,
            unit=self.other_unit,
            item_type=CatalogItemType.PRODUCT,
            code="OTHER-001",
            sku="OTHER-SKU-001",
            barcode="OTHER-BAR-001",
            name="Other Company Product",
            purchase_price=Decimal("10.00"),
            cost_price=Decimal("10.00"),
            sale_price=Decimal("15.00"),
            track_inventory=True,
            is_purchasable=True,
            is_sellable=True,
        )

        self.warehouse = Warehouse.objects.create(
            company=self.company,
            branch=self.branch,
            code="WH-001",
            name="Main Warehouse",
            warehouse_type=WarehouseType.MAIN,
            is_default=True,
            created_by=self.user,
            updated_by=self.user,
        )
        self.second_warehouse = Warehouse.objects.create(
            company=self.company,
            branch=self.branch,
            code="WH-002",
            name="Second Warehouse",
            warehouse_type=WarehouseType.BRANCH,
            created_by=self.user,
            updated_by=self.user,
        )
        self.other_warehouse = Warehouse.objects.create(
            company=self.other_company,
            branch=self.other_branch,
            code="WH-001",
            name="Other Warehouse",
            warehouse_type=WarehouseType.MAIN,
        )


class InventoryUtilityTests(InventoryTestBase):
    def test_quantize_quantity(self):
        self.assertEqual(quantize_quantity("1.23456"), Decimal("1.2346"))
        self.assertEqual(quantize_quantity(None), Decimal("0.0000"))

    def test_quantize_money(self):
        self.assertEqual(quantize_money("1.235"), Decimal("1.24"))
        self.assertEqual(quantize_money(None), Decimal("0.00"))


class WarehouseModelTests(InventoryTestBase):
    def test_warehouse_created_successfully(self):
        self.assertEqual(self.warehouse.company, self.company)
        self.assertEqual(self.warehouse.branch, self.branch)
        self.assertEqual(self.warehouse.code, "WH-001")
        self.assertTrue(self.warehouse.is_active_warehouse)

    def test_warehouse_display_name_uses_arabic_then_english_then_name(self):
        warehouse = Warehouse.objects.create(
            company=self.company,
            code="WH-003",
            name="Base Name",
            name_ar="المستودع العربي",
            name_en="English Warehouse",
        )
        self.assertEqual(warehouse.display_name, "المستودع العربي")

    def test_warehouse_branch_must_belong_to_same_company(self):
        warehouse = Warehouse(
            company=self.company,
            branch=self.other_branch,
            code="BAD-BRANCH",
            name="Bad Branch Warehouse",
        )

        with self.assertRaises(ValidationError):
            warehouse.full_clean()

    def test_warehouse_code_unique_per_company(self):
        duplicate = Warehouse(
            company=self.company,
            code="WH-001",
            name="Duplicate Code Warehouse",
        )

        with self.assertRaises(ValidationError):
            duplicate.full_clean()

    def test_same_warehouse_code_allowed_for_different_companies(self):
        warehouse = Warehouse.objects.get(
            company=self.other_company,
            code="WH-001",
        )
        self.assertEqual(warehouse.name, "Other Warehouse")

    def test_only_one_default_warehouse_per_company(self):
        new_default = Warehouse.objects.create(
            company=self.company,
            code="WH-004",
            name="New Default Warehouse",
            is_default=True,
        )

        self.warehouse.refresh_from_db()
        new_default.refresh_from_db()

        self.assertFalse(self.warehouse.is_default)
        self.assertTrue(new_default.is_default)

    def test_warehouse_activate_deactivate_archive(self):
        self.warehouse.deactivate(user=self.user)
        self.warehouse.refresh_from_db()
        self.assertEqual(self.warehouse.status, WarehouseStatus.INACTIVE)
        self.assertFalse(self.warehouse.is_active)

        self.warehouse.activate(user=self.user)
        self.warehouse.refresh_from_db()
        self.assertEqual(self.warehouse.status, WarehouseStatus.ACTIVE)
        self.assertTrue(self.warehouse.is_active)

        self.warehouse.archive(user=self.user)
        self.warehouse.refresh_from_db()
        self.assertEqual(self.warehouse.status, WarehouseStatus.ARCHIVED)
        self.assertFalse(self.warehouse.is_active)


class WarehouseServiceTests(InventoryTestBase):
    def test_create_warehouse_service(self):
        warehouse = create_warehouse(
            company=self.company,
            data={
                "branch_id": self.branch.id,
                "code": "WH-SVC-001",
                "name": "Service Warehouse",
                "warehouse_type": WarehouseType.RETURN,
                "city": "Jeddah",
                "is_default": False,
            },
            user=self.user,
        )

        self.assertEqual(warehouse.company, self.company)
        self.assertEqual(warehouse.branch, self.branch)
        self.assertEqual(warehouse.code, "WH-SVC-001")
        self.assertEqual(warehouse.city, "Jeddah")

    def test_create_warehouse_rejects_other_company_branch(self):
        with self.assertRaises(ValidationError):
            create_warehouse(
                company=self.company,
                data={
                    "branch_id": self.other_branch.id,
                    "code": "BAD-WH",
                    "name": "Bad Warehouse",
                },
                user=self.user,
            )

    def test_update_warehouse_service(self):
        warehouse = update_warehouse(
            company=self.company,
            warehouse=self.warehouse,
            data={
                "name": "Updated Warehouse",
                "city": "Riyadh",
                "manager_name": "Manager Name",
            },
            user=self.user,
        )

        self.assertEqual(warehouse.name, "Updated Warehouse")
        self.assertEqual(warehouse.city, "Riyadh")
        self.assertEqual(warehouse.manager_name, "Manager Name")

    def test_update_warehouse_rejects_cross_company_warehouse(self):
        with self.assertRaises(ValidationError):
            update_warehouse(
                company=self.company,
                warehouse=self.other_warehouse,
                data={"name": "Should Fail"},
                user=self.user,
            )

    def test_set_warehouse_status_service(self):
        warehouse = set_warehouse_status(
            company=self.company,
            warehouse=self.warehouse,
            status=WarehouseStatus.INACTIVE,
            user=self.user,
        )

        self.assertEqual(warehouse.status, WarehouseStatus.INACTIVE)
        self.assertFalse(warehouse.is_active)

    def test_get_company_warehouses_returns_only_company_data(self):
        queryset = get_company_warehouses(self.company)

        self.assertIn(self.warehouse, queryset)
        self.assertIn(self.second_warehouse, queryset)
        self.assertNotIn(self.other_warehouse, queryset)

    def test_get_active_company_warehouses(self):
        self.second_warehouse.deactivate(user=self.user)

        queryset = get_active_company_warehouses(self.company)

        self.assertIn(self.warehouse, queryset)
        self.assertNotIn(self.second_warehouse, queryset)



class WarehouseStockSummaryTests(InventoryTestBase):
    """
    Phase 22.1.7 warehouse multi-location stock summary tests.
    """

    def test_warehouse_summary_aggregates_multi_location_balances(self):
        first_location = create_inventory_location(
            company=self.company,
            warehouse=self.warehouse,
            data={
                "code": "SUMMARY-BIN-01",
                "name": "Summary Bin 01",
                "location_type": InventoryLocationType.BIN,
                "is_default": True,
            },
            user=self.user,
        )
        second_location = create_inventory_location(
            company=self.company,
            warehouse=self.warehouse,
            data={
                "code": "SUMMARY-BIN-02",
                "name": "Summary Bin 02",
                "location_type": InventoryLocationType.BIN,
            },
            user=self.user,
        )

        receive_stock(
            company=self.company,
            warehouse=self.warehouse,
            location=first_location,
            item=self.product,
            quantity="10",
            unit_cost="12.00",
            user=self.user,
        )
        receive_stock(
            company=self.company,
            warehouse=self.warehouse,
            location=second_location,
            item=self.product,
            quantity="5",
            unit_cost="14.00",
            user=self.user,
        )
        receive_stock(
            company=self.company,
            warehouse=self.warehouse,
            location=first_location,
            item=self.second_product,
            quantity="7",
            unit_cost="20.00",
            user=self.user,
        )

        first_product_stock = StockItem.objects.get(
            company=self.company,
            warehouse=self.warehouse,
            location=first_location,
            item=self.product,
        )
        second_product_stock = StockItem.objects.get(
            company=self.company,
            warehouse=self.warehouse,
            location=first_location,
            item=self.second_product,
        )

        first_product_stock.reserved_quantity = Decimal("2.0000")
        first_product_stock.full_clean()
        first_product_stock.save(
            update_fields=[
                "reserved_quantity",
                "updated_at",
            ]
        )

        second_product_stock.reserved_quantity = Decimal("1.0000")
        second_product_stock.full_clean()
        second_product_stock.save(
            update_fields=[
                "reserved_quantity",
                "updated_at",
            ]
        )

        payload = serialize_warehouse(
            self.warehouse,
            include_summary=True,
        )
        summary = payload["summary"]

        self.assertEqual(
            summary["stock_items_count"],
            3,
        )
        self.assertEqual(
            summary["location_balances_count"],
            3,
        )
        self.assertEqual(
            summary["distinct_items_count"],
            2,
        )
        self.assertEqual(
            summary["locations_count"],
            2,
        )
        self.assertEqual(
            summary["total_quantity_on_hand"],
            "22",
        )
        self.assertEqual(
            summary["total_reserved_quantity"],
            "3",
        )
        self.assertEqual(
            summary["total_available_quantity"],
            "19",
        )

    def test_warehouse_summary_returns_zero_values_without_stock(self):
        payload = serialize_warehouse(
            self.second_warehouse,
            include_summary=True,
        )
        summary = payload["summary"]

        self.assertEqual(summary["stock_items_count"], 0)
        self.assertEqual(summary["location_balances_count"], 0)
        self.assertEqual(summary["distinct_items_count"], 0)
        self.assertEqual(summary["locations_count"], 0)
        self.assertEqual(
            summary["total_quantity_on_hand"],
            "0.0000",
        )
        self.assertEqual(
            summary["total_reserved_quantity"],
            "0.0000",
        )
        self.assertEqual(
            summary["total_available_quantity"],
            "0.0000",
        )


class InventoryLocationModelTests(InventoryTestBase):
    """
    Inventory location model validation tests.
    """

    def test_inventory_location_created_successfully(self):
        location = InventoryLocation.objects.create(
            company=self.company,
            warehouse=self.warehouse,
            code="zone-a",
            name="Zone A",
            location_type=InventoryLocationType.ZONE,
            created_by=self.user,
            updated_by=self.user,
        )

        self.assertEqual(location.company, self.company)
        self.assertEqual(location.warehouse, self.warehouse)
        self.assertEqual(location.code, "ZONE-A")
        self.assertEqual(location.status, InventoryLocationStatus.ACTIVE)
        self.assertTrue(location.is_active_location)

    def test_inventory_location_display_name_priority(self):
        location = InventoryLocation.objects.create(
            company=self.company,
            warehouse=self.warehouse,
            code="LOC-NAME",
            name="Base Name",
            name_ar="الموقع العربي",
            name_en="English Location",
        )

        self.assertEqual(location.display_name, "الموقع العربي")

    def test_inventory_location_full_path(self):
        zone = InventoryLocation.objects.create(
            company=self.company,
            warehouse=self.warehouse,
            code="ZONE-A",
            name="Zone A",
            location_type=InventoryLocationType.ZONE,
        )
        aisle = InventoryLocation.objects.create(
            company=self.company,
            warehouse=self.warehouse,
            parent=zone,
            code="AISLE-01",
            name="Aisle 01",
            location_type=InventoryLocationType.AISLE,
        )
        rack = InventoryLocation.objects.create(
            company=self.company,
            warehouse=self.warehouse,
            parent=aisle,
            code="RACK-01",
            name="Rack 01",
            location_type=InventoryLocationType.RACK,
        )

        self.assertEqual(
            rack.full_path,
            "Zone A / Aisle 01 / Rack 01",
        )

    def test_inventory_location_rejects_other_company_warehouse(self):
        location = InventoryLocation(
            company=self.company,
            warehouse=self.other_warehouse,
            code="BAD-WH",
            name="Bad Warehouse Location",
        )

        with self.assertRaises(ValidationError):
            location.full_clean()

    def test_inventory_location_rejects_parent_from_other_warehouse(self):
        other_location = InventoryLocation.objects.create(
            company=self.company,
            warehouse=self.second_warehouse,
            code="OTHER-LOC",
            name="Other Location",
        )

        location = InventoryLocation(
            company=self.company,
            warehouse=self.warehouse,
            parent=other_location,
            code="BAD-PARENT",
            name="Bad Parent Location",
        )

        with self.assertRaises(ValidationError):
            location.full_clean()

    def test_inventory_location_rejects_parent_from_other_company(self):
        other_location = InventoryLocation.objects.create(
            company=self.other_company,
            warehouse=self.other_warehouse,
            code="OTHER-COMPANY-LOC",
            name="Other Company Location",
        )

        location = InventoryLocation(
            company=self.company,
            warehouse=self.warehouse,
            parent=other_location,
            code="BAD-COMPANY-PARENT",
            name="Bad Company Parent",
        )

        with self.assertRaises(ValidationError):
            location.full_clean()

    def test_inventory_location_rejects_self_parent(self):
        location = InventoryLocation.objects.create(
            company=self.company,
            warehouse=self.warehouse,
            code="SELF-PARENT",
            name="Self Parent",
        )
        location.parent = location

        with self.assertRaises(ValidationError):
            location.full_clean()

    def test_inventory_location_rejects_hierarchy_cycle(self):
        first = InventoryLocation.objects.create(
            company=self.company,
            warehouse=self.warehouse,
            code="CYCLE-1",
            name="Cycle One",
        )
        second = InventoryLocation.objects.create(
            company=self.company,
            warehouse=self.warehouse,
            parent=first,
            code="CYCLE-2",
            name="Cycle Two",
        )

        first.parent = second

        with self.assertRaises(ValidationError):
            first.full_clean()

    def test_special_location_type_sets_purpose_flags(self):
        receiving = InventoryLocation.objects.create(
            company=self.company,
            warehouse=self.warehouse,
            code="RECEIVE-AREA",
            name="Receive Area",
            location_type=InventoryLocationType.RECEIVING,
            is_pickable=True,
        )

        self.assertTrue(receiving.is_receiving)
        self.assertFalse(receiving.is_pickable)

    def test_inventory_location_activate_deactivate_archive(self):
        location = InventoryLocation.objects.create(
            company=self.company,
            warehouse=self.warehouse,
            code="STATUS-LOC",
            name="Status Location",
        )

        location.deactivate(user=self.user)
        location.refresh_from_db()
        self.assertEqual(
            location.status,
            InventoryLocationStatus.INACTIVE,
        )
        self.assertFalse(location.is_active)

        location.activate(user=self.user)
        location.refresh_from_db()
        self.assertEqual(
            location.status,
            InventoryLocationStatus.ACTIVE,
        )
        self.assertTrue(location.is_active)

        location.archive(user=self.user)
        location.refresh_from_db()
        self.assertEqual(
            location.status,
            InventoryLocationStatus.ARCHIVED,
        )
        self.assertFalse(location.is_active)


class InventoryLocationServiceTests(InventoryTestBase):
    """
    Inventory location service and tenant isolation tests.
    """

    def test_create_inventory_location_service(self):
        location = create_inventory_location(
            company=self.company,
            warehouse=self.warehouse,
            data={
                "code": "bin-001",
                "name": "Bin 001",
                "location_type": InventoryLocationType.BIN,
                "barcode": "LOC-BAR-001",
                "sequence": 10,
            },
            user=self.user,
        )

        self.assertEqual(location.company, self.company)
        self.assertEqual(location.warehouse, self.warehouse)
        self.assertEqual(location.code, "BIN-001")
        self.assertEqual(location.barcode, "LOC-BAR-001")
        self.assertEqual(location.sequence, 10)
        self.assertEqual(location.created_by, self.user)

    def test_create_inventory_location_rejects_other_company_warehouse(self):
        with self.assertRaises(ValidationError):
            create_inventory_location(
                company=self.company,
                warehouse=self.other_warehouse,
                data={
                    "code": "BAD-LOCATION",
                    "name": "Bad Location",
                },
                user=self.user,
            )

    def test_create_inventory_location_with_parent(self):
        parent = create_inventory_location(
            company=self.company,
            warehouse=self.warehouse,
            data={
                "code": "ZONE-PARENT",
                "name": "Parent Zone",
                "location_type": InventoryLocationType.ZONE,
            },
            user=self.user,
        )

        child = create_inventory_location(
            company=self.company,
            warehouse=self.warehouse,
            data={
                "parent_id": parent.id,
                "code": "BIN-CHILD",
                "name": "Child Bin",
                "location_type": InventoryLocationType.BIN,
            },
            user=self.user,
        )

        self.assertEqual(child.parent, parent)
        self.assertEqual(
            child.full_path,
            "Parent Zone / Child Bin",
        )

    def test_create_inventory_location_rejects_parent_from_other_warehouse(self):
        parent = create_inventory_location(
            company=self.company,
            warehouse=self.second_warehouse,
            data={
                "code": "OTHER-PARENT",
                "name": "Other Parent",
            },
            user=self.user,
        )

        with self.assertRaises(ValidationError):
            create_inventory_location(
                company=self.company,
                warehouse=self.warehouse,
                data={
                    "parent_id": parent.id,
                    "code": "INVALID-CHILD",
                    "name": "Invalid Child",
                },
                user=self.user,
            )

    def test_update_inventory_location_service(self):
        location = create_inventory_location(
            company=self.company,
            warehouse=self.warehouse,
            data={
                "code": "UPDATE-LOC",
                "name": "Before Update",
            },
            user=self.user,
        )

        updated = update_inventory_location(
            company=self.company,
            location=location,
            data={
                "code": "updated-loc",
                "name": "After Update",
                "barcode": "UPDATED-BARCODE",
                "sequence": 25,
                "is_pickable": False,
            },
            user=self.user,
        )

        self.assertEqual(updated.code, "UPDATED-LOC")
        self.assertEqual(updated.name, "After Update")
        self.assertEqual(updated.barcode, "UPDATED-BARCODE")
        self.assertEqual(updated.sequence, 25)
        self.assertFalse(updated.is_pickable)
        self.assertEqual(updated.updated_by, self.user)

    def test_update_inventory_location_rejects_cross_company_location(self):
        other_location = create_inventory_location(
            company=self.other_company,
            warehouse=self.other_warehouse,
            data={
                "code": "OTHER-UPDATE",
                "name": "Other Update",
            },
            user=self.user,
        )

        with self.assertRaises(ValidationError):
            update_inventory_location(
                company=self.company,
                location=other_location,
                data={"name": "Should Fail"},
                user=self.user,
            )

    def test_update_inventory_location_prevents_warehouse_change(self):
        location = create_inventory_location(
            company=self.company,
            warehouse=self.warehouse,
            data={
                "code": "NO-MOVE",
                "name": "No Move",
            },
            user=self.user,
        )

        with self.assertRaises(ValidationError):
            update_inventory_location(
                company=self.company,
                location=location,
                data={
                    "warehouse_id": self.second_warehouse.id,
                },
                user=self.user,
            )

    def test_set_inventory_location_status_service(self):
        location = create_inventory_location(
            company=self.company,
            warehouse=self.warehouse,
            data={
                "code": "STATUS-SVC",
                "name": "Status Service",
            },
            user=self.user,
        )

        updated = set_inventory_location_status(
            company=self.company,
            location=location,
            status=InventoryLocationStatus.INACTIVE,
            user=self.user,
        )

        self.assertEqual(
            updated.status,
            InventoryLocationStatus.INACTIVE,
        )
        self.assertFalse(updated.is_active)

    def test_get_company_inventory_locations_is_tenant_scoped(self):
        company_location = create_inventory_location(
            company=self.company,
            warehouse=self.warehouse,
            data={
                "code": "COMPANY-LOC",
                "name": "Company Location",
            },
            user=self.user,
        )
        other_location = create_inventory_location(
            company=self.other_company,
            warehouse=self.other_warehouse,
            data={
                "code": "OTHER-LOC",
                "name": "Other Location",
            },
            user=self.user,
        )

        queryset = get_company_inventory_locations(self.company)

        self.assertIn(company_location, queryset)
        self.assertNotIn(other_location, queryset)

    def test_get_warehouse_inventory_locations_is_warehouse_scoped(self):
        first_location = create_inventory_location(
            company=self.company,
            warehouse=self.warehouse,
            data={
                "code": "FIRST-WH-LOC",
                "name": "First Warehouse Location",
            },
            user=self.user,
        )
        second_location = create_inventory_location(
            company=self.company,
            warehouse=self.second_warehouse,
            data={
                "code": "SECOND-WH-LOC",
                "name": "Second Warehouse Location",
            },
            user=self.user,
        )

        queryset = get_warehouse_inventory_locations(
            company=self.company,
            warehouse=self.warehouse,
        )

        self.assertIn(first_location, queryset)
        self.assertNotIn(second_location, queryset)

    def test_get_active_warehouse_inventory_locations(self):
        active_location = create_inventory_location(
            company=self.company,
            warehouse=self.warehouse,
            data={
                "code": "ACTIVE-LOC",
                "name": "Active Location",
            },
            user=self.user,
        )
        inactive_location = create_inventory_location(
            company=self.company,
            warehouse=self.warehouse,
            data={
                "code": "INACTIVE-LOC",
                "name": "Inactive Location",
            },
            user=self.user,
        )
        inactive_location.deactivate(user=self.user)

        queryset = get_active_warehouse_inventory_locations(
            company=self.company,
            warehouse=self.warehouse,
        )

        self.assertIn(active_location, queryset)
        self.assertNotIn(inactive_location, queryset)

    def test_validate_inventory_location_for_company(self):
        location = create_inventory_location(
            company=self.company,
            warehouse=self.warehouse,
            data={
                "code": "VALIDATE-LOC",
                "name": "Validate Location",
            },
            user=self.user,
        )

        validate_inventory_location_for_company(
            company=self.company,
            location=location,
            warehouse=self.warehouse,
            require_active=True,
        )

        with self.assertRaises(ValidationError):
            validate_inventory_location_for_company(
                company=self.other_company,
                location=location,
            )

    def test_build_inventory_location_payload(self):
        location = create_inventory_location(
            company=self.company,
            warehouse=self.warehouse,
            data={
                "code": "PAYLOAD-LOC",
                "name": "Payload Location",
                "name_ar": "موقع البيانات",
                "location_type": InventoryLocationType.BIN,
                "sequence": 15,
            },
            user=self.user,
        )

        payload = build_inventory_location_payload(location)

        self.assertEqual(payload["id"], location.id)
        self.assertEqual(payload["company_id"], self.company.id)
        self.assertEqual(payload["warehouse_id"], self.warehouse.id)
        self.assertEqual(payload["code"], "PAYLOAD-LOC")
        self.assertEqual(payload["display_name"], "موقع البيانات")
        self.assertEqual(payload["sequence"], 15)

    def test_ensure_default_inventory_locations(self):
        result = ensure_default_inventory_locations(
            company=self.company,
            warehouse=self.warehouse,
            user=self.user,
        )

        self.assertEqual(
            set(result.keys()),
            {
                "default",
                "receiving",
                "shipping",
                "adjustment",
            },
        )
        self.assertEqual(
            InventoryLocation.objects.filter(
                company=self.company,
                warehouse=self.warehouse,
            ).count(),
            4,
        )

        self.assertTrue(result["default"].is_default)
        self.assertTrue(result["default"].is_pickable)
        self.assertTrue(result["receiving"].is_receiving)
        self.assertFalse(result["receiving"].is_pickable)
        self.assertTrue(result["shipping"].is_shipping)
        self.assertTrue(result["adjustment"].is_adjustment)

    def test_ensure_default_inventory_locations_is_idempotent(self):
        first = ensure_default_inventory_locations(
            company=self.company,
            warehouse=self.warehouse,
            user=self.user,
        )
        second = ensure_default_inventory_locations(
            company=self.company,
            warehouse=self.warehouse,
            user=self.user,
        )

        self.assertEqual(
            InventoryLocation.objects.filter(
                company=self.company,
                warehouse=self.warehouse,
            ).count(),
            4,
        )

        for key in first:
            self.assertEqual(first[key].id, second[key].id)

    def test_default_and_purpose_location_resolvers(self):
        locations = ensure_default_inventory_locations(
            company=self.company,
            warehouse=self.warehouse,
            user=self.user,
        )

        default_location = get_default_inventory_location(
            company=self.company,
            warehouse=self.warehouse,
        )
        receiving_location = get_inventory_location_by_purpose(
            company=self.company,
            warehouse=self.warehouse,
            purpose="receiving",
        )
        shipping_location = get_inventory_location_by_purpose(
            company=self.company,
            warehouse=self.warehouse,
            purpose="shipping",
        )
        adjustment_location = get_inventory_location_by_purpose(
            company=self.company,
            warehouse=self.warehouse,
            purpose="adjustment",
        )

        self.assertEqual(
            default_location.id,
            locations["default"].id,
        )
        self.assertEqual(
            receiving_location.id,
            locations["receiving"].id,
        )
        self.assertEqual(
            shipping_location.id,
            locations["shipping"].id,
        )
        self.assertEqual(
            adjustment_location.id,
            locations["adjustment"].id,
        )



class InventoryLocationAPITests(InventoryTestBase):
    """
    Inventory locations API, permissions, and tenant-isolation tests.
    """

    def setUp(self):
        super().setUp()

        self.profile, _created = UserProfile.objects.get_or_create(
            user=self.user,
            defaults={
                "display_name": "Inventory API User",
                "default_company": self.company,
                "is_system_user": False,
            },
        )

        if self.profile.default_company_id != self.company.id:
            self.profile.default_company = self.company
            self.profile.save(
                update_fields=[
                    "default_company",
                    "updated_at",
                ]
            )

        self.membership, _created = CompanyMembership.objects.get_or_create(
            user=self.user,
            company=self.company,
            defaults={
                "role": CompanyRole.ADMIN,
                "status": MembershipStatus.ACTIVE,
                "is_primary": True,
            },
        )

        membership_changed = False

        if self.membership.role != CompanyRole.ADMIN:
            self.membership.role = CompanyRole.ADMIN
            membership_changed = True

        if self.membership.status != MembershipStatus.ACTIVE:
            self.membership.status = MembershipStatus.ACTIVE
            membership_changed = True

        if not self.membership.is_primary:
            self.membership.is_primary = True
            membership_changed = True

        if membership_changed:
            self.membership.save()

        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        self.list_url = reverse(
            "company:company_inventory_locations_list"
        )
        self.create_url = reverse(
            "company:company_inventory_location_create"
        )

    def _create_location(
        self,
        *,
        warehouse=None,
        company=None,
        code="API-LOC",
        name="API Location",
        parent=None,
        location_type=InventoryLocationType.BIN,
        **extra,
    ):
        warehouse = warehouse or self.warehouse
        company = company or warehouse.company

        return InventoryLocation.objects.create(
            company=company,
            warehouse=warehouse,
            parent=parent,
            code=code,
            name=name,
            location_type=location_type,
            **extra,
        )

    def test_locations_list_returns_current_company_locations_only(self):
        current_location = self._create_location(
            code="CURRENT-LOCATION",
            name="Current Company Location",
        )
        other_location = self._create_location(
            company=self.other_company,
            warehouse=self.other_warehouse,
            code="OTHER-LOCATION",
            name="Other Company Location",
        )

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["ok"])

        result_ids = {
            item["id"]
            for item in response.data["results"]
        }

        self.assertIn(current_location.id, result_ids)
        self.assertNotIn(other_location.id, result_ids)

    def test_locations_list_supports_search_and_warehouse_filter(self):
        matching_location = self._create_location(
            warehouse=self.warehouse,
            code="SEARCH-BIN-001",
            name="Searchable Bin",
        )
        self._create_location(
            warehouse=self.second_warehouse,
            code="OTHER-BIN-001",
            name="Other Warehouse Bin",
        )

        response = self.client.get(
            self.list_url,
            {
                "search": "SEARCH-BIN",
                "warehouse_id": self.warehouse.id,
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(
            response.data["results"][0]["id"],
            matching_location.id,
        )

    def test_locations_list_returns_children_count(self):
        parent = self._create_location(
            code="API-PARENT",
            name="API Parent",
            location_type=InventoryLocationType.ZONE,
        )
        self._create_location(
            code="API-CHILD",
            name="API Child",
            parent=parent,
        )

        response = self.client.get(
            self.list_url,
            {
                "search": "API-PARENT",
                "root_only": "true",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(
            response.data["results"][0]["children_count"],
            1,
        )
        self.assertTrue(
            response.data["results"][0]["has_children"]
        )

    def test_location_detail_returns_location_and_children(self):
        parent = self._create_location(
            code="DETAIL-PARENT",
            name="Detail Parent",
            location_type=InventoryLocationType.ZONE,
        )
        child = self._create_location(
            code="DETAIL-CHILD",
            name="Detail Child",
            parent=parent,
        )

        detail_url = reverse(
            "company:company_inventory_location_detail",
            kwargs={
                "location_id": parent.id,
            },
        )

        response = self.client.get(detail_url)

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["ok"])
        self.assertEqual(
            response.data["location"]["id"],
            parent.id,
        )
        self.assertEqual(response.data["children_count"], 1)
        self.assertEqual(
            response.data["children"][0]["id"],
            child.id,
        )

    def test_location_detail_hides_other_company_location(self):
        other_location = self._create_location(
            company=self.other_company,
            warehouse=self.other_warehouse,
            code="HIDDEN-OTHER-LOCATION",
            name="Hidden Other Location",
        )

        detail_url = reverse(
            "company:company_inventory_location_detail",
            kwargs={
                "location_id": other_location.id,
            },
        )

        response = self.client.get(detail_url)

        self.assertEqual(response.status_code, 404)
        self.assertFalse(response.data["ok"])

    def test_location_create_api(self):
        response = self.client.post(
            self.create_url,
            {
                "warehouse_id": self.warehouse.id,
                "code": "api-new-bin",
                "name": "API New Bin",
                "name_ar": "خانة جديدة",
                "location_type": InventoryLocationType.BIN,
                "barcode": "API-NEW-BIN-BARCODE",
                "sequence": 12,
                "is_pickable": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.data["ok"])

        location = InventoryLocation.objects.get(
            id=response.data["location"]["id"],
        )

        self.assertEqual(location.company, self.company)
        self.assertEqual(location.warehouse, self.warehouse)
        self.assertEqual(location.code, "API-NEW-BIN")
        self.assertEqual(location.name_ar, "خانة جديدة")
        self.assertEqual(location.sequence, 12)
        self.assertEqual(location.created_by, self.user)

    def test_location_create_ignores_frontend_company_id(self):
        response = self.client.post(
            self.create_url,
            {
                "company_id": self.other_company.id,
                "warehouse_id": self.warehouse.id,
                "code": "SAFE-COMPANY-LOCATION",
                "name": "Safe Company Location",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)

        location = InventoryLocation.objects.get(
            id=response.data["location"]["id"],
        )

        self.assertEqual(location.company, self.company)
        self.assertNotEqual(location.company, self.other_company)

    def test_location_create_rejects_other_company_warehouse(self):
        response = self.client.post(
            self.create_url,
            {
                "warehouse_id": self.other_warehouse.id,
                "code": "BAD-CROSS-WAREHOUSE",
                "name": "Bad Cross Warehouse",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 404)
        self.assertFalse(response.data["ok"])
        self.assertFalse(
            InventoryLocation.objects.filter(
                company=self.company,
                code="BAD-CROSS-WAREHOUSE",
            ).exists()
        )

    def test_location_create_with_parent(self):
        parent = self._create_location(
            code="CREATE-PARENT",
            name="Create Parent",
            location_type=InventoryLocationType.ZONE,
        )

        response = self.client.post(
            self.create_url,
            {
                "warehouse_id": self.warehouse.id,
                "parent_id": parent.id,
                "code": "CREATE-CHILD",
                "name": "Create Child",
                "location_type": InventoryLocationType.BIN,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(
            response.data["location"]["parent_id"],
            parent.id,
        )
        self.assertEqual(
            response.data["location"]["full_path"],
            "Create Parent / Create Child",
        )

    def test_location_create_rejects_parent_from_other_warehouse(self):
        parent = self._create_location(
            warehouse=self.second_warehouse,
            code="OTHER-WAREHOUSE-PARENT",
            name="Other Warehouse Parent",
        )

        response = self.client.post(
            self.create_url,
            {
                "warehouse_id": self.warehouse.id,
                "parent_id": parent.id,
                "code": "INVALID-PARENT-CHILD",
                "name": "Invalid Parent Child",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.data["ok"])

    def test_location_update_api(self):
        location = self._create_location(
            code="BEFORE-UPDATE",
            name="Before Update",
        )

        update_url = reverse(
            "company:company_inventory_location_update",
            kwargs={
                "location_id": location.id,
            },
        )

        response = self.client.patch(
            update_url,
            {
                "code": "after-update",
                "name": "After Update",
                "barcode": "AFTER-UPDATE-BARCODE",
                "sequence": 44,
                "is_pickable": False,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["ok"])

        location.refresh_from_db()

        self.assertEqual(location.code, "AFTER-UPDATE")
        self.assertEqual(location.name, "After Update")
        self.assertEqual(
            location.barcode,
            "AFTER-UPDATE-BARCODE",
        )
        self.assertEqual(location.sequence, 44)
        self.assertFalse(location.is_pickable)
        self.assertEqual(location.updated_by, self.user)

    def test_location_update_hides_other_company_location(self):
        other_location = self._create_location(
            company=self.other_company,
            warehouse=self.other_warehouse,
            code="OTHER-UPDATE-API",
            name="Other Update API",
        )

        update_url = reverse(
            "company:company_inventory_location_update",
            kwargs={
                "location_id": other_location.id,
            },
        )

        response = self.client.patch(
            update_url,
            {
                "name": "Should Not Update",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 404)

        other_location.refresh_from_db()
        self.assertEqual(
            other_location.name,
            "Other Update API",
        )

    def test_location_update_prevents_warehouse_change(self):
        location = self._create_location(
            code="NO-API-MOVE",
            name="No API Move",
        )

        update_url = reverse(
            "company:company_inventory_location_update",
            kwargs={
                "location_id": location.id,
            },
        )

        response = self.client.patch(
            update_url,
            {
                "warehouse_id": self.second_warehouse.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)

        location.refresh_from_db()
        self.assertEqual(
            location.warehouse,
            self.warehouse,
        )

    def test_location_status_api_deactivates_location(self):
        location = self._create_location(
            code="STATUS-API-LOCATION",
            name="Status API Location",
        )

        status_url = reverse(
            "company:company_inventory_location_status",
            kwargs={
                "location_id": location.id,
            },
        )

        response = self.client.post(
            status_url,
            {
                "status": InventoryLocationStatus.INACTIVE,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)

        location.refresh_from_db()

        self.assertEqual(
            location.status,
            InventoryLocationStatus.INACTIVE,
        )
        self.assertFalse(location.is_active)

    def test_location_status_api_accepts_action_alias(self):
        location = self._create_location(
            code="ACTION-STATUS-LOCATION",
            name="Action Status Location",
        )

        status_url = reverse(
            "company:company_inventory_location_status",
            kwargs={
                "location_id": location.id,
            },
        )

        response = self.client.post(
            status_url,
            {
                "action": "archive",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)

        location.refresh_from_db()

        self.assertEqual(
            location.status,
            InventoryLocationStatus.ARCHIVED,
        )
        self.assertFalse(location.is_active)

    def test_location_status_rejects_invalid_status(self):
        location = self._create_location(
            code="INVALID-STATUS-LOCATION",
            name="Invalid Status Location",
        )

        status_url = reverse(
            "company:company_inventory_location_status",
            kwargs={
                "location_id": location.id,
            },
        )

        response = self.client.post(
            status_url,
            {
                "status": "DELETED",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.data["ok"])

        location.refresh_from_db()
        self.assertEqual(
            location.status,
            InventoryLocationStatus.ACTIVE,
        )



class LocationAwareStockServicesTests(InventoryTestBase):
    """
    Phase 22.1.6.5.4 true multi-location stock services tests.

    Active rule:
    StockItem has one independent row per
    company / warehouse / location / item.
    Explicit locations are supported, but one existing warehouse-level
    balance cannot be reassigned to another location until the location-level
    uniqueness migration is completed.
    """

    def _create_location(
        self,
        *,
        warehouse=None,
        company=None,
        code,
        name,
        is_default=False,
        is_active=True,
    ):
        warehouse = warehouse or self.warehouse
        company = company or warehouse.company

        location = create_inventory_location(
            company=company,
            warehouse=warehouse,
            data={
                "code": code,
                "name": name,
                "location_type": InventoryLocationType.BIN,
                "is_default": is_default,
                "is_pickable": True,
                "is_active": is_active,
            },
            user=self.user,
        )

        return location

    def test_receive_stock_creates_default_stock_location_automatically(self):
        self.assertFalse(
            InventoryLocation.objects.filter(
                company=self.company,
                warehouse=self.warehouse,
            ).exists()
        )

        movement = receive_stock(
            company=self.company,
            warehouse=self.warehouse,
            item=self.product,
            quantity="5",
            unit_cost="10.00",
            user=self.user,
        )

        location = InventoryLocation.objects.get(
            company=self.company,
            warehouse=self.warehouse,
            code="STOCK",
        )

        self.assertEqual(location.status, InventoryLocationStatus.ACTIVE)
        self.assertTrue(location.is_active)
        self.assertTrue(location.is_default)
        self.assertTrue(location.is_pickable)
        self.assertEqual(movement.location, location)
        self.assertEqual(movement.stock_item.location, location)

    def test_repeated_stock_movements_reuse_same_default_location(self):
        first_movement = receive_stock(
            company=self.company,
            warehouse=self.warehouse,
            item=self.product,
            quantity="5",
            unit_cost="10.00",
            user=self.user,
        )

        second_movement = receive_stock(
            company=self.company,
            warehouse=self.warehouse,
            item=self.product,
            quantity="2",
            unit_cost="10.00",
            user=self.user,
        )

        locations = InventoryLocation.objects.filter(
            company=self.company,
            warehouse=self.warehouse,
        )

        self.assertEqual(locations.count(), 1)
        self.assertEqual(
            first_movement.location_id,
            second_movement.location_id,
        )
        self.assertEqual(
            first_movement.stock_item_id,
            second_movement.stock_item_id,
        )

    def test_stock_service_uses_existing_default_location(self):
        default_location = self._create_location(
            code="DEFAULT-BIN",
            name="Default Bin",
            is_default=True,
        )

        movement = receive_stock(
            company=self.company,
            warehouse=self.warehouse,
            item=self.product,
            quantity="4",
            unit_cost="10.00",
            user=self.user,
        )

        self.assertEqual(movement.location, default_location)
        self.assertEqual(
            movement.stock_item.location,
            default_location,
        )
        self.assertFalse(
            InventoryLocation.objects.filter(
                company=self.company,
                warehouse=self.warehouse,
                code="STOCK",
            ).exists()
        )

    def test_stock_movement_and_balance_use_same_explicit_location(self):
        location = self._create_location(
            code="EXPLICIT-BIN",
            name="Explicit Bin",
        )

        movement = receive_stock(
            company=self.company,
            warehouse=self.warehouse,
            location=location,
            item=self.product,
            quantity="7",
            unit_cost="11.00",
            user=self.user,
        )

        stock_item = StockItem.objects.get(
            company=self.company,
            warehouse=self.warehouse,
            item=self.product,
        )

        self.assertEqual(stock_item.location, location)
        self.assertEqual(movement.location, location)
        self.assertEqual(movement.stock_item, stock_item)
        self.assertEqual(
            stock_item.quantity_on_hand,
            Decimal("7.0000"),
        )

    def test_stock_service_accepts_valid_explicit_location(self):
        location = self._create_location(
            code="PICK-BIN",
            name="Pick Bin",
        )

        stock_item = get_or_create_stock_item(
            company=self.company,
            warehouse=self.warehouse,
            location=location,
            item=self.second_product,
            user=self.user,
        )

        self.assertEqual(stock_item.location, location)
        self.assertEqual(stock_item.company, self.company)
        self.assertEqual(stock_item.warehouse, self.warehouse)
        self.assertEqual(stock_item.item, self.second_product)

    def test_stock_service_rejects_other_company_location(self):
        other_location = self._create_location(
            company=self.other_company,
            warehouse=self.other_warehouse,
            code="OTHER-COMPANY-BIN",
            name="Other Company Bin",
        )

        with self.assertRaises(ValidationError):
            receive_stock(
                company=self.company,
                warehouse=self.warehouse,
                location=other_location,
                item=self.product,
                quantity="1",
                unit_cost="10.00",
                user=self.user,
            )

        self.assertFalse(
            StockItem.objects.filter(
                company=self.company,
                warehouse=self.warehouse,
                item=self.product,
            ).exists()
        )

    def test_stock_service_rejects_location_from_other_warehouse(self):
        other_warehouse_location = self._create_location(
            warehouse=self.second_warehouse,
            code="SECOND-WAREHOUSE-BIN",
            name="Second Warehouse Bin",
        )

        with self.assertRaises(ValidationError):
            receive_stock(
                company=self.company,
                warehouse=self.warehouse,
                location=other_warehouse_location,
                item=self.product,
                quantity="1",
                unit_cost="10.00",
                user=self.user,
            )

        self.assertFalse(
            StockItem.objects.filter(
                company=self.company,
                warehouse=self.warehouse,
                item=self.product,
            ).exists()
        )

    def test_stock_service_rejects_inactive_location(self):
        inactive_location = self._create_location(
            code="INACTIVE-STOCK-BIN",
            name="Inactive Stock Bin",
        )
        inactive_location.deactivate(user=self.user)
        inactive_location.refresh_from_db()

        self.assertEqual(
            inactive_location.status,
            InventoryLocationStatus.INACTIVE,
        )
        self.assertFalse(inactive_location.is_active)

        with self.assertRaises(ValidationError):
            receive_stock(
                company=self.company,
                warehouse=self.warehouse,
                location=inactive_location,
                item=self.product,
                quantity="1",
                unit_cost="10.00",
                user=self.user,
            )

    def test_same_item_can_have_independent_balances_in_two_locations(self):
        first_location = self._create_location(
            code="FIRST-STOCK-BIN",
            name="First Stock Bin",
        )
        second_location = self._create_location(
            code="SECOND-STOCK-BIN",
            name="Second Stock Bin",
        )

        first_movement = receive_stock(
            company=self.company,
            warehouse=self.warehouse,
            location=first_location,
            item=self.product,
            quantity="5",
            unit_cost="10.00",
            user=self.user,
        )

        second_movement = receive_stock(
            company=self.company,
            warehouse=self.warehouse,
            location=second_location,
            item=self.product,
            quantity="1",
            unit_cost="12.00",
            user=self.user,
        )

        first_stock_item = StockItem.objects.get(
            company=self.company,
            warehouse=self.warehouse,
            location=first_location,
            item=self.product,
        )
        second_stock_item = StockItem.objects.get(
            company=self.company,
            warehouse=self.warehouse,
            location=second_location,
            item=self.product,
        )

        self.assertNotEqual(
            first_stock_item.id,
            second_stock_item.id,
        )
        self.assertEqual(
            first_movement.stock_item_id,
            first_stock_item.id,
        )
        self.assertEqual(
            second_movement.stock_item_id,
            second_stock_item.id,
        )
        self.assertEqual(
            first_stock_item.quantity_on_hand,
            Decimal("5.0000"),
        )
        self.assertEqual(
            second_stock_item.quantity_on_hand,
            Decimal("1.0000"),
        )
        self.assertEqual(
            StockItem.objects.filter(
                company=self.company,
                warehouse=self.warehouse,
                item=self.product,
            ).count(),
            2,
        )

    def test_transfer_stock_supports_explicit_source_and_target_locations(self):
        source_location = self._create_location(
            warehouse=self.warehouse,
            code="TRANSFER-SOURCE-BIN",
            name="Transfer Source Bin",
        )
        target_location = self._create_location(
            warehouse=self.second_warehouse,
            code="TRANSFER-TARGET-BIN",
            name="Transfer Target Bin",
        )

        receive_stock(
            company=self.company,
            warehouse=self.warehouse,
            location=source_location,
            item=self.product,
            quantity="10",
            unit_cost="10.00",
            user=self.user,
        )

        result = transfer_stock(
            company=self.company,
            source_warehouse=self.warehouse,
            target_warehouse=self.second_warehouse,
            source_location=source_location,
            target_location=target_location,
            item=self.product,
            quantity="4",
            reference_number="LOC-TRANSFER-001",
            user=self.user,
        )

        outgoing = result["outgoing"]
        incoming = result["incoming"]

        self.assertEqual(outgoing.location, source_location)
        self.assertEqual(incoming.location, target_location)
        self.assertEqual(
            outgoing.movement_type,
            StockMovementType.TRANSFER_OUT,
        )
        self.assertEqual(
            incoming.movement_type,
            StockMovementType.TRANSFER_IN,
        )

        source_stock = StockItem.objects.get(
            company=self.company,
            warehouse=self.warehouse,
            item=self.product,
        )
        target_stock = StockItem.objects.get(
            company=self.company,
            warehouse=self.second_warehouse,
            item=self.product,
        )

        self.assertEqual(source_stock.location, source_location)
        self.assertEqual(target_stock.location, target_location)
        self.assertEqual(
            source_stock.quantity_on_hand,
            Decimal("6.0000"),
        )
        self.assertEqual(
            target_stock.quantity_on_hand,
            Decimal("4.0000"),
        )



    def test_issue_stock_only_reduces_selected_location_balance(self):
        first_location = self._create_location(
            code="ISSUE-FIRST-BIN",
            name="Issue First Bin",
        )
        second_location = self._create_location(
            code="ISSUE-SECOND-BIN",
            name="Issue Second Bin",
        )

        receive_stock(
            company=self.company,
            warehouse=self.warehouse,
            location=first_location,
            item=self.product,
            quantity="8",
            unit_cost="10.00",
            user=self.user,
        )
        receive_stock(
            company=self.company,
            warehouse=self.warehouse,
            location=second_location,
            item=self.product,
            quantity="6",
            unit_cost="12.00",
            user=self.user,
        )

        movement = issue_stock(
            company=self.company,
            warehouse=self.warehouse,
            location=first_location,
            item=self.product,
            quantity="3",
            user=self.user,
            post_accounting=False,
        )

        first_stock = StockItem.objects.get(
            company=self.company,
            warehouse=self.warehouse,
            location=first_location,
            item=self.product,
        )
        second_stock = StockItem.objects.get(
            company=self.company,
            warehouse=self.warehouse,
            location=second_location,
            item=self.product,
        )

        self.assertEqual(movement.location, first_location)
        self.assertEqual(
            first_stock.quantity_on_hand,
            Decimal("5.0000"),
        )
        self.assertEqual(
            second_stock.quantity_on_hand,
            Decimal("6.0000"),
        )

    def test_issue_stock_rejects_insufficient_selected_location_balance(self):
        first_location = self._create_location(
            code="LIMITED-FIRST-BIN",
            name="Limited First Bin",
        )
        second_location = self._create_location(
            code="FUNDED-SECOND-BIN",
            name="Funded Second Bin",
        )

        receive_stock(
            company=self.company,
            warehouse=self.warehouse,
            location=first_location,
            item=self.product,
            quantity="2",
            unit_cost="10.00",
            user=self.user,
        )
        receive_stock(
            company=self.company,
            warehouse=self.warehouse,
            location=second_location,
            item=self.product,
            quantity="20",
            unit_cost="10.00",
            user=self.user,
        )

        with self.assertRaises(ValidationError):
            issue_stock(
                company=self.company,
                warehouse=self.warehouse,
                location=first_location,
                item=self.product,
                quantity="3",
                user=self.user,
                post_accounting=False,
            )

        first_stock = StockItem.objects.get(
            company=self.company,
            warehouse=self.warehouse,
            location=first_location,
            item=self.product,
        )
        second_stock = StockItem.objects.get(
            company=self.company,
            warehouse=self.warehouse,
            location=second_location,
            item=self.product,
        )

        self.assertEqual(
            first_stock.quantity_on_hand,
            Decimal("2.0000"),
        )
        self.assertEqual(
            second_stock.quantity_on_hand,
            Decimal("20.0000"),
        )

    def test_locations_keep_independent_average_costs(self):
        first_location = self._create_location(
            code="COST-FIRST-BIN",
            name="Cost First Bin",
        )
        second_location = self._create_location(
            code="COST-SECOND-BIN",
            name="Cost Second Bin",
        )

        receive_stock(
            company=self.company,
            warehouse=self.warehouse,
            location=first_location,
            item=self.product,
            quantity="4",
            unit_cost="10.00",
            user=self.user,
        )
        receive_stock(
            company=self.company,
            warehouse=self.warehouse,
            location=second_location,
            item=self.product,
            quantity="5",
            unit_cost="25.00",
            user=self.user,
        )

        first_stock = StockItem.objects.get(
            company=self.company,
            warehouse=self.warehouse,
            location=first_location,
            item=self.product,
        )
        second_stock = StockItem.objects.get(
            company=self.company,
            warehouse=self.warehouse,
            location=second_location,
            item=self.product,
        )

        self.assertEqual(
            first_stock.average_cost,
            Decimal("10.00"),
        )
        self.assertEqual(
            second_stock.average_cost,
            Decimal("25.00"),
        )

    def test_transfer_stock_between_locations_in_same_warehouse(self):
        source_location = self._create_location(
            code="INTERNAL-SOURCE-BIN",
            name="Internal Source Bin",
        )
        target_location = self._create_location(
            code="INTERNAL-TARGET-BIN",
            name="Internal Target Bin",
        )

        receive_stock(
            company=self.company,
            warehouse=self.warehouse,
            location=source_location,
            item=self.product,
            quantity="10",
            unit_cost="14.00",
            user=self.user,
        )

        result = transfer_stock(
            company=self.company,
            source_warehouse=self.warehouse,
            target_warehouse=self.warehouse,
            source_location=source_location,
            target_location=target_location,
            item=self.product,
            quantity="4",
            reference_number="INTERNAL-TRANSFER-001",
            user=self.user,
        )

        source_stock = StockItem.objects.get(
            company=self.company,
            warehouse=self.warehouse,
            location=source_location,
            item=self.product,
        )
        target_stock = StockItem.objects.get(
            company=self.company,
            warehouse=self.warehouse,
            location=target_location,
            item=self.product,
        )

        self.assertEqual(
            source_stock.quantity_on_hand,
            Decimal("6.0000"),
        )
        self.assertEqual(
            target_stock.quantity_on_hand,
            Decimal("4.0000"),
        )
        self.assertEqual(
            result["outgoing"].location,
            source_location,
        )
        self.assertEqual(
            result["incoming"].location,
            target_location,
        )
        self.assertEqual(
            result["incoming"].unit_cost,
            Decimal("14.00"),
        )

    def test_transfer_stock_rejects_same_source_and_target_location(self):
        location = self._create_location(
            code="SAME-TRANSFER-BIN",
            name="Same Transfer Bin",
        )

        receive_stock(
            company=self.company,
            warehouse=self.warehouse,
            location=location,
            item=self.product,
            quantity="5",
            unit_cost="10.00",
            user=self.user,
        )

        with self.assertRaises(ValidationError):
            transfer_stock(
                company=self.company,
                source_warehouse=self.warehouse,
                target_warehouse=self.warehouse,
                source_location=location,
                target_location=location,
                item=self.product,
                quantity="1",
                user=self.user,
            )

        stock_item = StockItem.objects.get(
            company=self.company,
            warehouse=self.warehouse,
            location=location,
            item=self.product,
        )

        self.assertEqual(
            stock_item.quantity_on_hand,
            Decimal("5.0000"),
        )


class LocationAwareStockReadCompatibilityTests(
    InventoryTestBase
):
    """
    Phase 22.1.6.5.2 location-aware read compatibility tests.

    These tests cover serializers and company stock APIs before
    enabling multiple StockItem rows for the same warehouse/item.
    """

    def setUp(self):
        super().setUp()

        self.profile, _created = UserProfile.objects.get_or_create(
            user=self.user,
            defaults={
                "display_name": "Stock Read API User",
                "default_company": self.company,
                "is_system_user": False,
            },
        )

        if self.profile.default_company_id != self.company.id:
            self.profile.default_company = self.company
            self.profile.save(
                update_fields=[
                    "default_company",
                    "updated_at",
                ]
            )

        self.membership, _created = (
            CompanyMembership.objects.get_or_create(
                user=self.user,
                company=self.company,
                defaults={
                    "role": CompanyRole.ADMIN,
                    "status": MembershipStatus.ACTIVE,
                    "is_primary": True,
                },
            )
        )

        membership_changed = False

        if self.membership.role != CompanyRole.ADMIN:
            self.membership.role = CompanyRole.ADMIN
            membership_changed = True

        if self.membership.status != MembershipStatus.ACTIVE:
            self.membership.status = MembershipStatus.ACTIVE
            membership_changed = True

        if not self.membership.is_primary:
            self.membership.is_primary = True
            membership_changed = True

        if membership_changed:
            self.membership.save()

        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def _create_location_stock(
        self,
        *,
        code="READ-BIN-001",
        name="Read Compatibility Bin",
        quantity="6.0000",
    ):
        location = create_inventory_location(
            company=self.company,
            warehouse=self.warehouse,
            data={
                "code": code,
                "name": name,
                "location_type": InventoryLocationType.BIN,
                "is_default": True,
                "is_pickable": True,
            },
            user=self.user,
        )

        movement = receive_stock(
            company=self.company,
            warehouse=self.warehouse,
            location=location,
            item=self.product,
            quantity=quantity,
            unit_cost="10.00",
            reference_number="READ-COMPAT-001",
            user=self.user,
        )

        movement.refresh_from_db()
        stock_item = movement.stock_item
        stock_item.refresh_from_db()

        return location, stock_item, movement

    def test_serialize_stock_item_includes_location_payload(self):
        location, stock_item, _movement = (
            self._create_location_stock()
        )

        payload = serialize_stock_item(stock_item)

        self.assertEqual(
            payload["location_id"],
            location.id,
        )
        self.assertEqual(
            payload["location"]["id"],
            location.id,
        )
        self.assertEqual(
            payload["location"]["code"],
            "READ-BIN-001",
        )
        self.assertEqual(
            payload["location"]["name"],
            location.display_name,
        )
        self.assertTrue(
            payload["location"]["is_default"]
        )

    def test_serialize_stock_movement_includes_location_payload(self):
        location, _stock_item, movement = (
            self._create_location_stock()
        )

        payload = serialize_stock_movement(movement)

        self.assertEqual(
            payload["location_id"],
            location.id,
        )
        self.assertEqual(
            payload["location"]["id"],
            location.id,
        )
        self.assertEqual(
            payload["location"]["code"],
            location.code,
        )
        self.assertEqual(
            payload["stock_item_id"],
            movement.stock_item_id,
        )

    def test_stock_list_api_includes_location_payload(self):
        location, stock_item, _movement = (
            self._create_location_stock()
        )

        response = self.client.get(
            "/api/company/inventory/stock/"
        )

        self.assertEqual(response.status_code, 200)

        payload = response.json()

        self.assertTrue(payload["success"])
        self.assertEqual(payload["count"], 1)
        self.assertEqual(
            payload["results"][0]["id"],
            stock_item.id,
        )
        self.assertEqual(
            payload["results"][0]["location_id"],
            location.id,
        )
        self.assertEqual(
            payload["results"][0]["location"]["code"],
            location.code,
        )

    def test_stock_list_api_filters_by_location_id(self):
        location, stock_item, _movement = (
            self._create_location_stock()
        )

        other_location = create_inventory_location(
            company=self.company,
            warehouse=self.second_warehouse,
            data={
                "code": "OTHER-READ-BIN",
                "name": "Other Read Bin",
                "location_type": InventoryLocationType.BIN,
                "is_default": True,
            },
            user=self.user,
        )

        receive_stock(
            company=self.company,
            warehouse=self.second_warehouse,
            location=other_location,
            item=self.second_product,
            quantity="3.0000",
            unit_cost="20.00",
            user=self.user,
        )

        response = self.client.get(
            "/api/company/inventory/stock/",
            {
                "location_id": location.id,
            },
        )

        self.assertEqual(response.status_code, 200)

        payload = response.json()

        self.assertEqual(payload["count"], 1)
        self.assertEqual(
            payload["results"][0]["id"],
            stock_item.id,
        )
        self.assertEqual(
            payload["filters"]["location_id"],
            str(location.id),
        )

    def test_stock_list_api_searches_by_location_code(self):
        location, stock_item, _movement = (
            self._create_location_stock(
                code="SEARCH-LOCATION-777",
                name="Search Location",
            )
        )

        response = self.client.get(
            "/api/company/inventory/stock/",
            {
                "search": "LOCATION-777",
            },
        )

        self.assertEqual(response.status_code, 200)

        payload = response.json()

        self.assertEqual(payload["count"], 1)
        self.assertEqual(
            payload["results"][0]["id"],
            stock_item.id,
        )
        self.assertEqual(
            payload["results"][0]["location"]["id"],
            location.id,
        )

    def test_stock_detail_api_includes_location_payload(self):
        location, stock_item, _movement = (
            self._create_location_stock()
        )

        response = self.client.get(
            (
                "/api/company/inventory/stock/"
                f"{stock_item.id}/"
            )
        )

        self.assertEqual(response.status_code, 200)

        payload = response.json()
        serialized = payload["stock_item"]

        self.assertTrue(payload["success"])
        self.assertEqual(
            serialized["id"],
            stock_item.id,
        )
        self.assertEqual(
            serialized["location_id"],
            location.id,
        )
        self.assertEqual(
            serialized["location"]["code"],
            location.code,
        )

    def _create_stock_summary_dataset(self):
        first_location = create_inventory_location(
            company=self.company,
            warehouse=self.warehouse,
            data={
                "code": "SUMMARY-API-BIN-01",
                "name": "Summary API Bin 01",
                "location_type": InventoryLocationType.BIN,
                "is_default": True,
            },
            user=self.user,
        )
        second_location = create_inventory_location(
            company=self.company,
            warehouse=self.warehouse,
            data={
                "code": "SUMMARY-API-BIN-02",
                "name": "Summary API Bin 02",
                "location_type": InventoryLocationType.BIN,
            },
            user=self.user,
        )
        third_location = create_inventory_location(
            company=self.company,
            warehouse=self.second_warehouse,
            data={
                "code": "SUMMARY-API-BIN-03",
                "name": "Summary API Bin 03",
                "location_type": InventoryLocationType.BIN,
                "is_default": True,
            },
            user=self.user,
        )

        first_movement = receive_stock(
            company=self.company,
            warehouse=self.warehouse,
            location=first_location,
            item=self.product,
            quantity="10.0000",
            unit_cost="10.00",
            user=self.user,
        )
        second_movement = receive_stock(
            company=self.company,
            warehouse=self.warehouse,
            location=second_location,
            item=self.product,
            quantity="5.0000",
            unit_cost="20.00",
            user=self.user,
        )
        third_movement = receive_stock(
            company=self.company,
            warehouse=self.second_warehouse,
            location=third_location,
            item=self.second_product,
            quantity="4.0000",
            unit_cost="30.00",
            user=self.user,
        )

        first_stock = first_movement.stock_item
        third_stock = third_movement.stock_item

        first_stock.reserved_quantity = Decimal("2.0000")
        first_stock.full_clean()
        first_stock.save(
            update_fields=[
                "reserved_quantity",
                "updated_at",
            ]
        )

        third_stock.reserved_quantity = Decimal("1.0000")
        third_stock.full_clean()
        third_stock.save(
            update_fields=[
                "reserved_quantity",
                "updated_at",
            ]
        )

        other_location = create_inventory_location(
            company=self.other_company,
            warehouse=self.other_warehouse,
            data={
                "code": "OTHER-SUMMARY-BIN",
                "name": "Other Summary Bin",
                "location_type": InventoryLocationType.BIN,
                "is_default": True,
            },
            user=self.user,
        )

        receive_stock(
            company=self.other_company,
            warehouse=self.other_warehouse,
            location=other_location,
            item=self.other_product,
            quantity="99.0000",
            unit_cost="99.00",
            user=self.user,
        )

        return {
            "first_location": first_location,
            "second_location": second_location,
            "third_location": third_location,
            "first_stock": first_movement.stock_item,
            "second_stock": second_movement.stock_item,
            "third_stock": third_movement.stock_item,
        }

    def test_stock_summary_api_aggregates_company_inventory(self):
        self._create_stock_summary_dataset()

        response = self.client.get(
            "/api/company/inventory/stock/summary/"
        )

        self.assertEqual(response.status_code, 200)

        payload = response.json()
        summary = payload["summary"]

        self.assertTrue(payload["success"])
        self.assertEqual(payload["count"], 2)
        self.assertEqual(
            summary["location_balances_count"],
            3,
        )
        self.assertEqual(
            summary["distinct_items_count"],
            2,
        )
        self.assertEqual(
            summary["warehouses_count"],
            2,
        )
        self.assertEqual(
            summary["locations_count"],
            3,
        )
        self.assertEqual(
            summary["total_quantity_on_hand"],
            "19.0000",
        )
        self.assertEqual(
            summary["total_reserved_quantity"],
            "3.0000",
        )
        self.assertEqual(
            summary["total_available_quantity"],
            "16.0000",
        )
        self.assertEqual(
            summary["total_inventory_value"],
            "320.00",
        )

        items_by_id = {
            item["item_id"]: item
            for item in payload["results"]
        }

        product_summary = items_by_id[self.product.id]
        second_product_summary = items_by_id[
            self.second_product.id
        ]

        self.assertEqual(
            product_summary["location_balances_count"],
            2,
        )
        self.assertEqual(
            product_summary["warehouses_count"],
            1,
        )
        self.assertEqual(
            product_summary["locations_count"],
            2,
        )
        self.assertEqual(
            product_summary["quantity_on_hand"],
            "15.0000",
        )
        self.assertEqual(
            product_summary["reserved_quantity"],
            "2.0000",
        )
        self.assertEqual(
            product_summary["available_quantity"],
            "13.0000",
        )
        self.assertEqual(
            product_summary["weighted_average_cost"],
            "13.33",
        )
        self.assertEqual(
            product_summary["inventory_value"],
            "200.00",
        )

        self.assertEqual(
            second_product_summary["quantity_on_hand"],
            "4.0000",
        )
        self.assertEqual(
            second_product_summary["weighted_average_cost"],
            "30.00",
        )
        self.assertEqual(
            second_product_summary["inventory_value"],
            "120.00",
        )

    def test_stock_summary_api_filters_by_warehouse(self):
        self._create_stock_summary_dataset()

        response = self.client.get(
            "/api/company/inventory/stock/summary/",
            {
                "warehouse_id": self.warehouse.id,
            },
        )

        self.assertEqual(response.status_code, 200)

        payload = response.json()
        summary = payload["summary"]

        self.assertEqual(payload["count"], 1)
        self.assertEqual(
            payload["filters"]["warehouse_id"],
            str(self.warehouse.id),
        )
        self.assertEqual(
            summary["location_balances_count"],
            2,
        )
        self.assertEqual(
            summary["distinct_items_count"],
            1,
        )
        self.assertEqual(
            summary["warehouses_count"],
            1,
        )
        self.assertEqual(
            summary["locations_count"],
            2,
        )
        self.assertEqual(
            summary["total_quantity_on_hand"],
            "15.0000",
        )
        self.assertEqual(
            summary["total_inventory_value"],
            "200.00",
        )
        self.assertEqual(
            payload["results"][0]["item_id"],
            self.product.id,
        )

    def test_stock_summary_api_excludes_other_company_stock(self):
        self._create_stock_summary_dataset()

        response = self.client.get(
            "/api/company/inventory/stock/summary/",
            {
                "search": "Other Company Product",
            },
        )

        self.assertEqual(response.status_code, 200)

        payload = response.json()

        self.assertTrue(payload["success"])
        self.assertEqual(payload["count"], 0)
        self.assertEqual(payload["results"], [])
        self.assertEqual(
            payload["summary"]["location_balances_count"],
            0,
        )
        self.assertEqual(
            payload["summary"]["total_quantity_on_hand"],
            "0.0000",
        )
        self.assertEqual(
            payload["summary"]["total_inventory_value"],
            "0.00",
        )


class StockItemTests(InventoryTestBase):
    def test_get_or_create_stock_item(self):
        stock_item = get_or_create_stock_item(
            company=self.company,
            warehouse=self.warehouse,
            item=self.product,
        )

        self.assertEqual(stock_item.company, self.company)
        self.assertEqual(stock_item.warehouse, self.warehouse)
        self.assertEqual(stock_item.item, self.product)
        self.assertEqual(stock_item.quantity_on_hand, QUANTITY_ZERO)

    def test_get_or_create_stock_item_is_idempotent(self):
        first = get_or_create_stock_item(
            company=self.company,
            warehouse=self.warehouse,
            item=self.product,
        )
        second = get_or_create_stock_item(
            company=self.company,
            warehouse=self.warehouse,
            item=self.product,
        )

        self.assertEqual(first.id, second.id)
        self.assertEqual(StockItem.objects.filter(company=self.company).count(), 1)

    def test_stock_item_rejects_service_item(self):
        with self.assertRaises(ValidationError):
            get_or_create_stock_item(
                company=self.company,
                warehouse=self.warehouse,
                item=self.service_item,
            )

    def test_stock_item_rejects_other_company_item(self):
        with self.assertRaises(ValidationError):
            get_or_create_stock_item(
                company=self.company,
                warehouse=self.warehouse,
                item=self.other_product,
            )

    def test_stock_item_rejects_other_company_warehouse(self):
        with self.assertRaises(ValidationError):
            get_or_create_stock_item(
                company=self.company,
                warehouse=self.other_warehouse,
                item=self.product,
            )

    def test_stock_item_available_quantity(self):
        location = create_inventory_location(
            company=self.company,
            warehouse=self.warehouse,
            data={
                "code": "AVAILABLE-QTY-BIN",
                "name": "Available Quantity Bin",
                "location_type": InventoryLocationType.BIN,
                "is_default": True,
            },
            user=self.user,
        )

        stock_item = StockItem.objects.create(
            company=self.company,
            warehouse=self.warehouse,
            location=location,
            item=self.product,
            quantity_on_hand=Decimal("10.0000"),
            reserved_quantity=Decimal("2.0000"),
        )

        self.assertEqual(
            stock_item.available_quantity,
            Decimal("8.0000"),
        )

    def test_stock_item_reserved_quantity_cannot_exceed_on_hand(self):
        location = create_inventory_location(
            company=self.company,
            warehouse=self.warehouse,
            data={
                "code": "RESERVED-QTY-BIN",
                "name": "Reserved Quantity Bin",
                "location_type": InventoryLocationType.BIN,
                "is_default": True,
            },
            user=self.user,
        )

        stock_item = StockItem(
            company=self.company,
            warehouse=self.warehouse,
            location=location,
            item=self.product,
            quantity_on_hand=Decimal("1.0000"),
            reserved_quantity=Decimal("2.0000"),
        )

        with self.assertRaises(ValidationError) as context:
            stock_item.full_clean()

        self.assertIn(
            "reserved_quantity",
            context.exception.message_dict,
        )

    def test_stock_item_minimum_and_maximum_validation(self):
        location = create_inventory_location(
            company=self.company,
            warehouse=self.warehouse,
            data={
                "code": "MIN-MAX-BIN",
                "name": "Minimum Maximum Bin",
                "location_type": InventoryLocationType.BIN,
                "is_default": True,
            },
            user=self.user,
        )

        stock_item = StockItem(
            company=self.company,
            warehouse=self.warehouse,
            location=location,
            item=self.product,
            quantity_on_hand=Decimal("1.0000"),
            minimum_quantity=Decimal("10.0000"),
            maximum_quantity=Decimal("5.0000"),
        )

        with self.assertRaises(ValidationError) as context:
            stock_item.full_clean()

        self.assertIn(
            "maximum_quantity",
            context.exception.message_dict,
        )


class StockMovementTests(InventoryTestBase):
    def test_receive_stock_increases_quantity(self):
        movement = receive_stock(
            company=self.company,
            warehouse=self.warehouse,
            item=self.product,
            quantity="10",
            unit_cost="12.00",
            reference_number="REC-001",
            user=self.user,
        )

        stock_item = StockItem.objects.get(
            company=self.company,
            warehouse=self.warehouse,
            item=self.product,
        )

        self.assertEqual(movement.status, StockMovementStatus.POSTED)
        self.assertEqual(movement.movement_type, StockMovementType.IN)
        self.assertEqual(movement.direction, StockMovementDirection.INCREASE)
        self.assertEqual(stock_item.quantity_on_hand, Decimal("10.0000"))
        self.assertEqual(movement.quantity_before, Decimal("0.0000"))
        self.assertEqual(movement.quantity_after, Decimal("10.0000"))

    def test_stock_movement_creates_automatic_accounting_entry_once(self):
        movement = receive_stock(
            company=self.company,
            warehouse=self.warehouse,
            item=self.product,
            quantity="5",
            unit_cost="10.00",
            reference_number="REC-AUTO-001",
            user=self.user,
        )

        movement.refresh_from_db()

        entries = JournalEntry.objects.filter(
            company=self.company,
            source_type="stock_movement",
            source_id=str(movement.id),
            source_number=movement.movement_number,
            is_auto_posted=True,
        )

        self.assertEqual(entries.count(), 1)

        entry = entries.get()
        self.assertEqual(entry.status, JournalEntryStatus.POSTED)
        self.assertEqual(entry.total_debit, movement.total_cost)
        self.assertEqual(entry.total_credit, movement.total_cost)
        self.assertEqual(entry.reference, movement.movement_number)
        self.assertEqual(entry.source_number, movement.movement_number)

        same_entry = post_stock_movement_to_accounting(
            movement,
            actor=self.user,
            auto_post=True,
        )

        self.assertEqual(same_entry.id, entry.id)
        self.assertEqual(entries.count(), 1)

    def test_transfer_stock_does_not_create_gl_journal_entries(self):
        receive_stock(
            company=self.company,
            warehouse=self.warehouse,
            item=self.product,
            quantity="10",
            unit_cost="10.00",
            user=self.user,
        )

        result = transfer_stock(
            company=self.company,
            source_warehouse=self.warehouse,
            target_warehouse=self.second_warehouse,
            item=self.product,
            quantity="4",
            reference_number="TR-NO-GL-001",
            user=self.user,
        )

        outgoing = result["outgoing"]
        incoming = result["incoming"]

        outgoing_entry = post_stock_movement_to_accounting(
            outgoing,
            actor=self.user,
            auto_post=True,
        )
        incoming_entry = post_stock_movement_to_accounting(
            incoming,
            actor=self.user,
            auto_post=True,
        )

        self.assertIsNone(outgoing_entry)
        self.assertIsNone(incoming_entry)

        self.assertFalse(
            JournalEntry.objects.filter(
                company=self.company,
                source_type="stock_movement",
                source_id=str(outgoing.id),
                is_auto_posted=True,
            ).exists()
        )
        self.assertFalse(
            JournalEntry.objects.filter(
                company=self.company,
                source_type="stock_movement",
                source_id=str(incoming.id),
                is_auto_posted=True,
            ).exists()
        )

    def test_issue_stock_decreases_quantity(self):
        receive_stock(
            company=self.company,
            warehouse=self.warehouse,
            item=self.product,
            quantity="10",
            unit_cost="10.00",
            user=self.user,
        )

        movement = issue_stock(
            company=self.company,
            warehouse=self.warehouse,
            item=self.product,
            quantity="3",
            reference_number="OUT-001",
            user=self.user,
        )

        stock_item = StockItem.objects.get(
            company=self.company,
            warehouse=self.warehouse,
            item=self.product,
        )

        self.assertEqual(movement.status, StockMovementStatus.POSTED)
        self.assertEqual(movement.movement_type, StockMovementType.OUT)
        self.assertEqual(movement.direction, StockMovementDirection.DECREASE)
        self.assertEqual(stock_item.quantity_on_hand, Decimal("7.0000"))
        self.assertEqual(movement.quantity_before, Decimal("10.0000"))
        self.assertEqual(movement.quantity_after, Decimal("7.0000"))

    def test_issue_stock_prevents_negative_stock(self):
        receive_stock(
            company=self.company,
            warehouse=self.warehouse,
            item=self.product,
            quantity="2",
            unit_cost="10.00",
            user=self.user,
        )

        with self.assertRaises(ValidationError):
            issue_stock(
                company=self.company,
                warehouse=self.warehouse,
                item=self.product,
                quantity="3",
                user=self.user,
            )

    def test_adjust_stock_increase(self):
        movement = adjust_stock(
            company=self.company,
            warehouse=self.warehouse,
            item=self.product,
            quantity="5",
            direction=StockMovementDirection.INCREASE,
            unit_cost="11.00",
            reference_number="ADJ-IN",
            user=self.user,
        )

        stock_item = StockItem.objects.get(
            company=self.company,
            warehouse=self.warehouse,
            item=self.product,
        )

        self.assertEqual(movement.movement_type, StockMovementType.ADJUSTMENT)
        self.assertEqual(movement.direction, StockMovementDirection.INCREASE)
        self.assertEqual(stock_item.quantity_on_hand, Decimal("5.0000"))

    def test_adjust_stock_decrease(self):
        receive_stock(
            company=self.company,
            warehouse=self.warehouse,
            item=self.product,
            quantity="10",
            unit_cost="10.00",
            user=self.user,
        )

        movement = adjust_stock(
            company=self.company,
            warehouse=self.warehouse,
            item=self.product,
            quantity="4",
            direction=StockMovementDirection.DECREASE,
            reference_number="ADJ-OUT",
            user=self.user,
        )

        stock_item = StockItem.objects.get(
            company=self.company,
            warehouse=self.warehouse,
            item=self.product,
        )

        self.assertEqual(movement.movement_type, StockMovementType.ADJUSTMENT)
        self.assertEqual(movement.direction, StockMovementDirection.DECREASE)
        self.assertEqual(stock_item.quantity_on_hand, Decimal("6.0000"))

    def test_adjust_stock_requires_direction(self):
        with self.assertRaises(ValidationError):
            create_stock_movement(
                company=self.company,
                warehouse=self.warehouse,
                item=self.product,
                movement_type=StockMovementType.ADJUSTMENT,
                quantity="1",
                direction=None,
                user=self.user,
            )

    def test_stock_movement_rejects_service_item(self):
        with self.assertRaises(ValidationError):
            receive_stock(
                company=self.company,
                warehouse=self.warehouse,
                item=self.service_item,
                quantity="1",
                user=self.user,
            )

    def test_stock_movement_rejects_other_company_item(self):
        with self.assertRaises(ValidationError):
            receive_stock(
                company=self.company,
                warehouse=self.warehouse,
                item=self.other_product,
                quantity="1",
                user=self.user,
            )

    def test_stock_movement_rejects_other_company_warehouse(self):
        with self.assertRaises(ValidationError):
            receive_stock(
                company=self.company,
                warehouse=self.other_warehouse,
                item=self.product,
                quantity="1",
                user=self.user,
            )

    def test_stock_movement_snapshot(self):
        movement = receive_stock(
            company=self.company,
            warehouse=self.warehouse,
            item=self.product,
            quantity="1",
            unit_cost="10.00",
            user=self.user,
        )

        self.assertEqual(movement.item_code_snapshot, "ITEM-001")
        self.assertEqual(movement.item_name_snapshot, "Inventory Product")
        self.assertEqual(movement.unit_name_snapshot, "Piece")

    def test_create_draft_stock_movement_without_posting(self):
        movement = create_stock_movement(
            company=self.company,
            warehouse=self.warehouse,
            item=self.product,
            movement_type=StockMovementType.IN,
            quantity="5",
            unit_cost="10.00",
            user=self.user,
            post_immediately=False,
        )

        stock_item = StockItem.objects.get(
            company=self.company,
            warehouse=self.warehouse,
            item=self.product,
        )

        self.assertEqual(movement.status, StockMovementStatus.DRAFT)
        self.assertEqual(stock_item.quantity_on_hand, Decimal("0.0000"))

    def test_company_stock_movements_queryset_is_tenant_scoped(self):
        company_movement = receive_stock(
            company=self.company,
            warehouse=self.warehouse,
            item=self.product,
            quantity="1",
            user=self.user,
        )
        other_movement = receive_stock(
            company=self.other_company,
            warehouse=self.other_warehouse,
            item=self.other_product,
            quantity="1",
            user=self.user,
        )

        queryset = get_company_stock_movements(self.company)

        self.assertIn(company_movement, queryset)
        self.assertNotIn(other_movement, queryset)

    def test_company_stock_items_queryset_is_tenant_scoped(self):
        company_stock = get_or_create_stock_item(
            company=self.company,
            warehouse=self.warehouse,
            item=self.product,
        )
        other_stock = get_or_create_stock_item(
            company=self.other_company,
            warehouse=self.other_warehouse,
            item=self.other_product,
        )

        queryset = get_company_stock_items(self.company)

        self.assertIn(company_stock, queryset)
        self.assertNotIn(other_stock, queryset)

    def test_average_cost_updates_on_receive(self):
        receive_stock(
            company=self.company,
            warehouse=self.warehouse,
            item=self.product,
            quantity="10",
            unit_cost="10.00",
            user=self.user,
        )
        receive_stock(
            company=self.company,
            warehouse=self.warehouse,
            item=self.product,
            quantity="10",
            unit_cost="20.00",
            user=self.user,
        )

        stock_item = StockItem.objects.get(
            company=self.company,
            warehouse=self.warehouse,
            item=self.product,
        )

        self.assertEqual(stock_item.quantity_on_hand, Decimal("20.0000"))
        self.assertEqual(stock_item.average_cost, Decimal("15.00"))


class StockTransferTests(InventoryTestBase):
    def test_transfer_stock_between_company_warehouses(self):
        receive_stock(
            company=self.company,
            warehouse=self.warehouse,
            item=self.product,
            quantity="10",
            unit_cost="10.00",
            user=self.user,
        )

        result = transfer_stock(
            company=self.company,
            source_warehouse=self.warehouse,
            target_warehouse=self.second_warehouse,
            item=self.product,
            quantity="4",
            reference_number="TR-001",
            user=self.user,
        )

        source_stock = StockItem.objects.get(
            company=self.company,
            warehouse=self.warehouse,
            item=self.product,
        )
        target_stock = StockItem.objects.get(
            company=self.company,
            warehouse=self.second_warehouse,
            item=self.product,
        )

        self.assertIn("outgoing", result)
        self.assertIn("incoming", result)
        self.assertEqual(result["outgoing"].movement_type, StockMovementType.TRANSFER_OUT)
        self.assertEqual(result["incoming"].movement_type, StockMovementType.TRANSFER_IN)
        self.assertEqual(source_stock.quantity_on_hand, Decimal("6.0000"))
        self.assertEqual(target_stock.quantity_on_hand, Decimal("4.0000"))

    def test_transfer_stock_prevents_same_source_and_target(self):
        receive_stock(
            company=self.company,
            warehouse=self.warehouse,
            item=self.product,
            quantity="10",
            unit_cost="10.00",
            user=self.user,
        )

        with self.assertRaises(ValidationError):
            transfer_stock(
                company=self.company,
                source_warehouse=self.warehouse,
                target_warehouse=self.warehouse,
                item=self.product,
                quantity="1",
                user=self.user,
            )

    def test_transfer_stock_prevents_cross_company_target_warehouse(self):
        receive_stock(
            company=self.company,
            warehouse=self.warehouse,
            item=self.product,
            quantity="10",
            unit_cost="10.00",
            user=self.user,
        )

        with self.assertRaises(ValidationError):
            transfer_stock(
                company=self.company,
                source_warehouse=self.warehouse,
                target_warehouse=self.other_warehouse,
                item=self.product,
                quantity="1",
                user=self.user,
            )

    def test_transfer_stock_prevents_negative_source_stock(self):
        receive_stock(
            company=self.company,
            warehouse=self.warehouse,
            item=self.product,
            quantity="2",
            unit_cost="10.00",
            user=self.user,
        )

        with self.assertRaises(ValidationError):
            transfer_stock(
                company=self.company,
                source_warehouse=self.warehouse,
                target_warehouse=self.second_warehouse,
                item=self.product,
                quantity="3",
                user=self.user,
            )


class InventoryValidationHelperTests(InventoryTestBase):
    def test_validate_warehouse_for_company_accepts_same_company(self):
        validate_warehouse_for_company(
            company=self.company,
            warehouse=self.warehouse,
        )

    def test_validate_warehouse_for_company_rejects_other_company(self):
        with self.assertRaises(ValidationError):
            validate_warehouse_for_company(
                company=self.company,
                warehouse=self.other_warehouse,
            )

    def test_validate_item_for_inventory_accepts_product(self):
        validate_item_for_inventory(
            company=self.company,
            item=self.product,
        )

    def test_validate_item_for_inventory_rejects_service(self):
        with self.assertRaises(ValidationError):
            validate_item_for_inventory(
                company=self.company,
                item=self.service_item,
            )