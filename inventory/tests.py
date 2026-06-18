# ============================================================
# 📂 inventory/tests.py
# 🧠 PrimeyAcc | Company Inventory Tests V2.8
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
# ✅ Batch and lot model validation tests
# ✅ Batch expiry and manufacturing date tests
# ✅ Batch location balance tests
# ✅ Serial number lifecycle tests
# ✅ Detailed tracking ledger model tests
# ✅ Batch and serial tenant isolation tests
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

from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone

from accounts.models import (
    CompanyMembership,
    CompanyRole,
    MembershipStatus,
    UserProfile,
)
from accounting.models import JournalEntry, JournalEntryStatus
from rest_framework.test import APIClient
from catalog.models import (
    CatalogItem,
    CatalogItemTrackingMethod,
    CatalogItemType,
    CatalogUnit,
)
from companies.models import Branch, Company
from parties.models import (
    BusinessParty,
    BusinessPartyStatus,
    BusinessPartyType,
)
from inventory.models import (
    QUANTITY_ZERO,
    InventoryBatch,
    InventoryBatchBalance,
    InventoryBatchStatus,
    InventorySerialNumber,
    InventorySerialStatus,
    InventoryTrackingEntry,
    InventoryTrackingEntryType,
    InventoryLocation,
    InventoryLocationStatus,
    InventoryLocationType,
    StockItem,
    StockMovement,
    StockMovementDirection,
    StockMovementStatus,
    StockMovementType,
    StockReservation,
    StockReservationAllocation,
    StockReservationAllocationStatus,
    StockReservationSource,
    StockReservationStatus,
    GoodsIssue,
    GoodsIssueItem,
    GoodsIssueStatus,
    PhysicalInventoryCount,
    PhysicalInventoryCountItem,
    PhysicalInventoryCountScope,
    PhysicalInventoryCountStatus,
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
    create_inventory_batch,
    create_inventory_tracking_entry,
    get_company_inventory_batch_balances,
    get_company_inventory_batches,
    get_company_inventory_serial_numbers,
    get_company_inventory_tracking_entries,
    get_or_create_inventory_batch_balance,
    register_inventory_serial_number,
    resolve_tracking_entry_direction,
    validate_inventory_batch_for_company,
    validate_inventory_serial_for_company,
    validate_inventory_tracking_item,
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
    issue_batch_stock,
    issue_serial_stock,
    receive_batch_stock,
    receive_serial_stock,
    post_stock_movement_to_accounting,
    receive_stock,
    set_inventory_location_status,
    set_warehouse_status,
    transfer_stock,
    transfer_batch_stock,
    transfer_serial_stock,
    update_inventory_location,
    update_warehouse,
    validate_inventory_location_for_company,
    validate_item_for_inventory,
    validate_warehouse_for_company,
    build_stock_reservation_allocation_payload,
    build_stock_reservation_payload,
    generate_stock_reservation_number,
    get_company_stock_reservation_allocations,
    get_company_stock_reservations,
    validate_sales_order_for_stock_reservation,
    validate_sales_order_item_for_stock_reservation,
    add_physical_inventory_count_item,
    build_physical_inventory_count_payload,
    build_physical_inventory_count_item_payload,
    cancel_physical_inventory_count,
    create_physical_inventory_count,
    generate_physical_inventory_count_number,
    get_company_physical_inventory_counts,
    get_company_physical_inventory_count_items,
    mark_physical_inventory_count_counted,
    post_physical_inventory_count,
    recalculate_physical_inventory_count_totals,
    set_physical_inventory_count_item_quantity,
    start_physical_inventory_count,
    validate_physical_inventory_count_for_company,
)


from sales.services import create_sales_order


from inventory.services import (
    allocate_stock_reservation,
    allocate_serial_stock_reservation,
    allocate_batch_stock_reservation,
    cancel_stock_reservation,
    create_sales_order_stock_reservation,
    expire_stock_reservation,
    release_stock_reservation_allocation,
    create_goods_issue,
    post_goods_issue,
    cancel_goods_issue,
    serialize_goods_issue,
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

class InventoryTrackingModelTests(InventoryTestBase):
    """
    Phase 22.2.1 batch, serial, expiry, and tracking model tests.
    """

    def setUp(self):
        super().setUp()

        self.location = create_inventory_location(
            company=self.company,
            warehouse=self.warehouse,
            data={
                "code": "TRACKING-BIN-001",
                "name": "Tracking Bin 001",
                "location_type": InventoryLocationType.BIN,
                "is_default": True,
                "is_pickable": True,
            },
            user=self.user,
        )

        self.batch_product = CatalogItem.objects.create(
            company=self.company,
            unit=self.unit,
            item_type=CatalogItemType.PRODUCT,
            code="BATCH-ITEM-001",
            sku="BATCH-SKU-001",
            barcode="BATCH-BAR-001",
            name="Batch Tracked Product",
            purchase_price=Decimal("15.00"),
            cost_price=Decimal("15.00"),
            sale_price=Decimal("25.00"),
            track_inventory=True,
            inventory_tracking_method=CatalogItemTrackingMethod.BATCH,
            track_expiry_dates=True,
            is_purchasable=True,
            is_sellable=True,
        )

        self.serial_product = CatalogItem.objects.create(
            company=self.company,
            unit=self.unit,
            item_type=CatalogItemType.PRODUCT,
            code="SERIAL-ITEM-001",
            sku="SERIAL-SKU-001",
            barcode="SERIAL-BAR-001",
            name="Serial Tracked Product",
            purchase_price=Decimal("50.00"),
            cost_price=Decimal("50.00"),
            sale_price=Decimal("75.00"),
            track_inventory=True,
            inventory_tracking_method=CatalogItemTrackingMethod.SERIAL,
            track_expiry_dates=False,
            is_purchasable=True,
            is_sellable=True,
        )

        self.batch_stock_item = get_or_create_stock_item(
            company=self.company,
            warehouse=self.warehouse,
            location=self.location,
            item=self.batch_product,
            user=self.user,
        )
        self.serial_stock_item = get_or_create_stock_item(
            company=self.company,
            warehouse=self.warehouse,
            location=self.location,
            item=self.serial_product,
            user=self.user,
        )

    def test_inventory_batch_created_successfully(self):
        batch = InventoryBatch.objects.create(
            company=self.company,
            item=self.batch_product,
            batch_number="batch-001",
            supplier_batch_number="supplier-001",
            manufactured_at=timezone.localdate(),
            expiry_date=timezone.localdate() + timedelta(days=365),
            created_by=self.user,
            updated_by=self.user,
        )

        self.assertEqual(batch.company, self.company)
        self.assertEqual(batch.item, self.batch_product)
        self.assertEqual(batch.batch_number, "BATCH-001")
        self.assertEqual(
            batch.supplier_batch_number,
            "SUPPLIER-001",
        )
        self.assertEqual(batch.status, InventoryBatchStatus.ACTIVE)
        self.assertFalse(batch.is_expired)
        self.assertTrue(batch.is_available_for_issue)

    def test_inventory_batch_requires_batch_tracked_product(self):
        batch = InventoryBatch(
            company=self.company,
            item=self.product,
            batch_number="INVALID-BATCH-PRODUCT",
            expiry_date=timezone.localdate() + timedelta(days=30),
        )

        with self.assertRaises(ValidationError) as context:
            batch.full_clean()

        self.assertIn("item", context.exception.message_dict)

    def test_inventory_batch_requires_expiry_for_configured_product(self):
        batch = InventoryBatch(
            company=self.company,
            item=self.batch_product,
            batch_number="MISSING-EXPIRY",
        )

        with self.assertRaises(ValidationError) as context:
            batch.full_clean()

        self.assertIn(
            "expiry_date",
            context.exception.message_dict,
        )

    def test_inventory_batch_rejects_expiry_before_manufacturing(self):
        today = timezone.localdate()

        batch = InventoryBatch(
            company=self.company,
            item=self.batch_product,
            batch_number="BAD-DATES",
            manufactured_at=today,
            expiry_date=today - timedelta(days=1),
        )

        with self.assertRaises(ValidationError) as context:
            batch.full_clean()

        self.assertIn(
            "expiry_date",
            context.exception.message_dict,
        )

    def test_expired_inventory_batch_changes_status(self):
        batch = InventoryBatch.objects.create(
            company=self.company,
            item=self.batch_product,
            batch_number="EXPIRED-BATCH",
            manufactured_at=timezone.localdate() - timedelta(days=60),
            expiry_date=timezone.localdate() - timedelta(days=1),
        )

        self.assertEqual(
            batch.status,
            InventoryBatchStatus.EXPIRED,
        )
        self.assertTrue(batch.is_expired)
        self.assertFalse(batch.is_available_for_issue)

    def test_inventory_batch_balance_created_successfully(self):
        batch = InventoryBatch.objects.create(
            company=self.company,
            item=self.batch_product,
            batch_number="BALANCE-BATCH-001",
            expiry_date=timezone.localdate() + timedelta(days=180),
        )

        balance = InventoryBatchBalance.objects.create(
            company=self.company,
            warehouse=self.warehouse,
            location=self.location,
            stock_item=self.batch_stock_item,
            item=self.batch_product,
            batch=batch,
            quantity_on_hand=Decimal("10.0000"),
            reserved_quantity=Decimal("2.0000"),
            average_cost=Decimal("15.00"),
        )

        self.assertEqual(
            balance.available_quantity,
            Decimal("8.0000"),
        )
        self.assertTrue(balance.is_available_for_issue)

    def test_inventory_batch_balance_rejects_reserved_above_on_hand(self):
        batch = InventoryBatch.objects.create(
            company=self.company,
            item=self.batch_product,
            batch_number="RESERVED-BATCH-001",
            expiry_date=timezone.localdate() + timedelta(days=180),
        )

        balance = InventoryBatchBalance(
            company=self.company,
            warehouse=self.warehouse,
            location=self.location,
            stock_item=self.batch_stock_item,
            item=self.batch_product,
            batch=batch,
            quantity_on_hand=Decimal("2.0000"),
            reserved_quantity=Decimal("3.0000"),
        )

        with self.assertRaises(ValidationError) as context:
            balance.full_clean()

        self.assertIn(
            "reserved_quantity",
            context.exception.message_dict,
        )

    def test_inventory_serial_number_created_successfully(self):
        serial = InventorySerialNumber.objects.create(
            company=self.company,
            item=self.serial_product,
            warehouse=self.warehouse,
            location=self.location,
            stock_item=self.serial_stock_item,
            serial_number="serial-0001",
            manufacturer_serial_number="manufacturer-0001",
            unit_cost=Decimal("50.00"),
            received_at=timezone.now(),
            created_by=self.user,
            updated_by=self.user,
        )

        self.assertEqual(serial.serial_number, "SERIAL-0001")
        self.assertEqual(
            serial.manufacturer_serial_number,
            "MANUFACTURER-0001",
        )
        self.assertEqual(
            serial.status,
            InventorySerialStatus.AVAILABLE,
        )
        self.assertTrue(serial.is_available)
        self.assertTrue(serial.is_in_stock)

    def test_inventory_serial_requires_serial_tracked_product(self):
        serial = InventorySerialNumber(
            company=self.company,
            item=self.product,
            warehouse=self.warehouse,
            location=self.location,
            stock_item=get_or_create_stock_item(
                company=self.company,
                warehouse=self.warehouse,
                location=self.location,
                item=self.product,
                user=self.user,
            ),
            serial_number="INVALID-SERIAL-PRODUCT",
        )

        with self.assertRaises(ValidationError) as context:
            serial.full_clean()

        self.assertIn("item", context.exception.message_dict)

    def test_available_serial_requires_current_location(self):
        serial = InventorySerialNumber(
            company=self.company,
            item=self.serial_product,
            serial_number="MISSING-LOCATION",
            status=InventorySerialStatus.AVAILABLE,
        )

        with self.assertRaises(ValidationError) as context:
            serial.full_clean()

        self.assertIn(
            "warehouse",
            context.exception.message_dict,
        )
        self.assertIn(
            "location",
            context.exception.message_dict,
        )
        self.assertIn(
            "stock_item",
            context.exception.message_dict,
        )

    def test_issued_serial_sets_issued_at(self):
        serial = InventorySerialNumber.objects.create(
            company=self.company,
            item=self.serial_product,
            serial_number="ISSUED-SERIAL-001",
            status=InventorySerialStatus.ISSUED,
            unit_cost=Decimal("50.00"),
        )

        self.assertIsNotNone(serial.issued_at)
        self.assertFalse(serial.is_available)
        self.assertFalse(serial.is_in_stock)

    def test_serial_number_is_unique_per_company(self):
        InventorySerialNumber.objects.create(
            company=self.company,
            item=self.serial_product,
            warehouse=self.warehouse,
            location=self.location,
            stock_item=self.serial_stock_item,
            serial_number="UNIQUE-SERIAL-001",
        )

        duplicate = InventorySerialNumber(
            company=self.company,
            item=self.serial_product,
            warehouse=self.warehouse,
            location=self.location,
            stock_item=self.serial_stock_item,
            serial_number="UNIQUE-SERIAL-001",
        )

        with self.assertRaises(ValidationError):
            duplicate.full_clean()

    def test_batch_tracking_entry_created_successfully(self):
        batch = InventoryBatch.objects.create(
            company=self.company,
            item=self.batch_product,
            batch_number="ENTRY-BATCH-001",
            expiry_date=timezone.localdate() + timedelta(days=365),
        )

        entry = InventoryTrackingEntry.objects.create(
            company=self.company,
            item=self.batch_product,
            warehouse=self.warehouse,
            location=self.location,
            stock_item=self.batch_stock_item,
            batch=batch,
            entry_type=InventoryTrackingEntryType.RECEIPT,
            direction=StockMovementDirection.DECREASE,
            quantity=Decimal("5.0000"),
            quantity_before=Decimal("0.0000"),
            quantity_after=Decimal("5.0000"),
            unit_cost=Decimal("15.00"),
            created_by=self.user,
        )

        self.assertEqual(
            entry.direction,
            StockMovementDirection.INCREASE,
        )
        self.assertEqual(entry.batch, batch)
        self.assertIsNone(entry.serial_number)

    def test_tracking_entry_requires_exactly_one_tracking_target(self):
        entry = InventoryTrackingEntry(
            company=self.company,
            item=self.batch_product,
            warehouse=self.warehouse,
            location=self.location,
            stock_item=self.batch_stock_item,
            entry_type=InventoryTrackingEntryType.RECEIPT,
            direction=StockMovementDirection.INCREASE,
            quantity=Decimal("1.0000"),
        )

        with self.assertRaises(ValidationError) as context:
            entry.full_clean()

        self.assertIn("batch", context.exception.message_dict)
        self.assertIn(
            "serial_number",
            context.exception.message_dict,
        )

    def test_serial_tracking_entry_requires_quantity_one(self):
        serial = InventorySerialNumber.objects.create(
            company=self.company,
            item=self.serial_product,
            warehouse=self.warehouse,
            location=self.location,
            stock_item=self.serial_stock_item,
            serial_number="ENTRY-SERIAL-001",
        )

        entry = InventoryTrackingEntry(
            company=self.company,
            item=self.serial_product,
            warehouse=self.warehouse,
            location=self.location,
            stock_item=self.serial_stock_item,
            serial_number=serial,
            entry_type=InventoryTrackingEntryType.RECEIPT,
            direction=StockMovementDirection.INCREASE,
            quantity=Decimal("2.0000"),
        )

        with self.assertRaises(ValidationError) as context:
            entry.full_clean()

        self.assertIn(
            "quantity",
            context.exception.message_dict,
        )

    def test_batch_rejects_other_company_item(self):
        batch = InventoryBatch(
            company=self.company,
            item=self.other_product,
            batch_number="CROSS-COMPANY-BATCH",
            expiry_date=timezone.localdate() + timedelta(days=30),
        )

        with self.assertRaises(ValidationError) as context:
            batch.full_clean()

        self.assertIn("item", context.exception.message_dict)


class InventoryTrackingServiceTests(InventoryTestBase):
    """
    Phase 22.2.2.1 inventory tracking core service tests.
    """

    def setUp(self):
        super().setUp()

        self.location = create_inventory_location(
            company=self.company,
            warehouse=self.warehouse,
            data={
                "code": "TRACK-SVC-BIN",
                "name": "Tracking Service Bin",
                "location_type": InventoryLocationType.BIN,
                "is_default": True,
                "is_pickable": True,
            },
            user=self.user,
        )

        self.batch_product = CatalogItem.objects.create(
            company=self.company,
            unit=self.unit,
            item_type=CatalogItemType.PRODUCT,
            code="BATCH-SVC-ITEM",
            sku="BATCH-SVC-SKU",
            barcode="BATCH-SVC-BAR",
            name="Batch Service Product",
            purchase_price=Decimal("12.00"),
            cost_price=Decimal("12.00"),
            sale_price=Decimal("20.00"),
            track_inventory=True,
            inventory_tracking_method=(
                CatalogItemTrackingMethod.BATCH
            ),
            track_expiry_dates=True,
            is_purchasable=True,
            is_sellable=True,
        )

        self.serial_product = CatalogItem.objects.create(
            company=self.company,
            unit=self.unit,
            item_type=CatalogItemType.PRODUCT,
            code="SERIAL-SVC-ITEM",
            sku="SERIAL-SVC-SKU",
            barcode="SERIAL-SVC-BAR",
            name="Serial Service Product",
            purchase_price=Decimal("55.00"),
            cost_price=Decimal("55.00"),
            sale_price=Decimal("80.00"),
            track_inventory=True,
            inventory_tracking_method=(
                CatalogItemTrackingMethod.SERIAL
            ),
            track_expiry_dates=False,
            is_purchasable=True,
            is_sellable=True,
        )

        self.batch_stock_item = (
            get_or_create_stock_item(
                company=self.company,
                warehouse=self.warehouse,
                location=self.location,
                item=self.batch_product,
                user=self.user,
            )
        )

        self.serial_stock_item = (
            get_or_create_stock_item(
                company=self.company,
                warehouse=self.warehouse,
                location=self.location,
                item=self.serial_product,
                user=self.user,
            )
        )

    def test_validate_inventory_tracking_item_accepts_batch(self):
        validate_inventory_tracking_item(
            company=self.company,
            item=self.batch_product,
            expected_method=(
                CatalogItemTrackingMethod.BATCH
            ),
        )

    def test_validate_inventory_tracking_item_rejects_none(self):
        with self.assertRaises(ValidationError) as context:
            validate_inventory_tracking_item(
                company=self.company,
                item=self.product,
            )

        self.assertIn(
            "item",
            context.exception.message_dict,
        )

    def test_create_inventory_batch_service(self):
        today = timezone.localdate()

        batch = create_inventory_batch(
            company=self.company,
            item=self.batch_product,
            batch_number="svc-batch-001",
            supplier_batch_number="supplier-svc-001",
            manufactured_at=today,
            expiry_date=today + timedelta(days=365),
            received_at=timezone.now(),
            notes="Service-created batch.",
            user=self.user,
        )

        self.assertEqual(
            batch.batch_number,
            "SVC-BATCH-001",
        )
        self.assertEqual(
            batch.supplier_batch_number,
            "SUPPLIER-SVC-001",
        )
        self.assertEqual(batch.company, self.company)
        self.assertEqual(batch.item, self.batch_product)
        self.assertEqual(batch.created_by, self.user)

    def test_create_inventory_batch_rejects_serial_product(self):
        with self.assertRaises(ValidationError):
            create_inventory_batch(
                company=self.company,
                item=self.serial_product,
                batch_number="INVALID-SERIAL-BATCH",
                expiry_date=(
                    timezone.localdate()
                    + timedelta(days=30)
                ),
                user=self.user,
            )

    def test_get_or_create_batch_balance_is_idempotent(self):
        batch = create_inventory_batch(
            company=self.company,
            item=self.batch_product,
            batch_number="BALANCE-SVC-001",
            expiry_date=(
                timezone.localdate()
                + timedelta(days=180)
            ),
            user=self.user,
        )

        first = get_or_create_inventory_batch_balance(
            company=self.company,
            warehouse=self.warehouse,
            location=self.location,
            item=self.batch_product,
            batch=batch,
            stock_item=self.batch_stock_item,
            user=self.user,
        )

        second = get_or_create_inventory_batch_balance(
            company=self.company,
            warehouse=self.warehouse,
            location=self.location,
            item=self.batch_product,
            batch=batch,
            stock_item=self.batch_stock_item,
            user=self.user,
        )

        self.assertEqual(first.id, second.id)
        self.assertEqual(
            InventoryBatchBalance.objects.filter(
                company=self.company,
                warehouse=self.warehouse,
                location=self.location,
                item=self.batch_product,
                batch=batch,
            ).count(),
            1,
        )

    def test_validate_batch_rejects_other_company(self):
        other_batch_product = CatalogItem.objects.create(
            company=self.other_company,
            unit=self.other_unit,
            item_type=CatalogItemType.PRODUCT,
            code="OTHER-BATCH-SVC",
            sku="OTHER-BATCH-SVC-SKU",
            barcode="OTHER-BATCH-SVC-BAR",
            name="Other Batch Service Product",
            purchase_price=Decimal("10.00"),
            cost_price=Decimal("10.00"),
            sale_price=Decimal("15.00"),
            track_inventory=True,
            inventory_tracking_method=(
                CatalogItemTrackingMethod.BATCH
            ),
            track_expiry_dates=True,
            is_purchasable=True,
            is_sellable=True,
        )

        other_batch = create_inventory_batch(
            company=self.other_company,
            item=other_batch_product,
            batch_number="OTHER-BATCH-001",
            expiry_date=(
                timezone.localdate()
                + timedelta(days=90)
            ),
            user=self.user,
        )

        with self.assertRaises(ValidationError) as context:
            validate_inventory_batch_for_company(
                company=self.company,
                batch=other_batch,
            )

        self.assertIn(
            "batch",
            context.exception.message_dict,
        )

    def test_register_inventory_serial_number_service(self):
        serial = register_inventory_serial_number(
            company=self.company,
            item=self.serial_product,
            warehouse=self.warehouse,
            location=self.location,
            stock_item=self.serial_stock_item,
            serial_number="svc-serial-0001",
            manufacturer_serial_number="mfg-svc-0001",
            unit_cost=Decimal("55.00"),
            user=self.user,
        )

        self.assertEqual(
            serial.serial_number,
            "SVC-SERIAL-0001",
        )
        self.assertEqual(
            serial.manufacturer_serial_number,
            "MFG-SVC-0001",
        )
        self.assertEqual(
            serial.status,
            InventorySerialStatus.AVAILABLE,
        )
        self.assertEqual(serial.warehouse, self.warehouse)
        self.assertEqual(serial.location, self.location)
        self.assertEqual(
            serial.stock_item,
            self.serial_stock_item,
        )

    def test_register_serial_rejects_batch_product(self):
        with self.assertRaises(ValidationError):
            register_inventory_serial_number(
                company=self.company,
                item=self.batch_product,
                warehouse=self.warehouse,
                location=self.location,
                serial_number="INVALID-BATCH-SERIAL",
                user=self.user,
            )

    def test_validate_serial_checks_current_location(self):
        serial = register_inventory_serial_number(
            company=self.company,
            item=self.serial_product,
            warehouse=self.warehouse,
            location=self.location,
            stock_item=self.serial_stock_item,
            serial_number="LOCATION-SERIAL-001",
            user=self.user,
        )

        other_location = create_inventory_location(
            company=self.company,
            warehouse=self.warehouse,
            data={
                "code": "OTHER-TRACK-SVC-BIN",
                "name": "Other Tracking Service Bin",
                "location_type": InventoryLocationType.BIN,
            },
            user=self.user,
        )

        with self.assertRaises(ValidationError) as context:
            validate_inventory_serial_for_company(
                company=self.company,
                serial_number=serial,
                item=self.serial_product,
                warehouse=self.warehouse,
                location=other_location,
                require_available=True,
            )

        self.assertIn(
            "serial_number",
            context.exception.message_dict,
        )

    def test_resolve_tracking_entry_direction(self):
        self.assertEqual(
            resolve_tracking_entry_direction(
                InventoryTrackingEntryType.RECEIPT
            ),
            StockMovementDirection.INCREASE,
        )
        self.assertEqual(
            resolve_tracking_entry_direction(
                InventoryTrackingEntryType.ISSUE
            ),
            StockMovementDirection.DECREASE,
        )

    def test_create_batch_tracking_entry_service(self):
        batch = create_inventory_batch(
            company=self.company,
            item=self.batch_product,
            batch_number="ENTRY-SVC-BATCH",
            expiry_date=(
                timezone.localdate()
                + timedelta(days=365)
            ),
            user=self.user,
        )

        entry = create_inventory_tracking_entry(
            company=self.company,
            item=self.batch_product,
            warehouse=self.warehouse,
            location=self.location,
            stock_item=self.batch_stock_item,
            batch=batch,
            entry_type=(
                InventoryTrackingEntryType.RECEIPT
            ),
            quantity=Decimal("5.0000"),
            quantity_before=Decimal("0.0000"),
            quantity_after=Decimal("5.0000"),
            unit_cost=Decimal("12.00"),
            reference_type="service_test",
            reference_id=101,
            reference_number="TRACK-SVC-001",
            user=self.user,
        )

        self.assertEqual(entry.batch, batch)
        self.assertIsNone(entry.serial_number)
        self.assertEqual(
            entry.direction,
            StockMovementDirection.INCREASE,
        )
        self.assertEqual(
            entry.quantity,
            Decimal("5.0000"),
        )

    def test_create_serial_tracking_entry_service(self):
        serial = register_inventory_serial_number(
            company=self.company,
            item=self.serial_product,
            warehouse=self.warehouse,
            location=self.location,
            stock_item=self.serial_stock_item,
            serial_number="ENTRY-SVC-SERIAL",
            user=self.user,
        )

        entry = create_inventory_tracking_entry(
            company=self.company,
            item=self.serial_product,
            warehouse=self.warehouse,
            location=self.location,
            stock_item=self.serial_stock_item,
            serial_number=serial,
            entry_type=(
                InventoryTrackingEntryType.RECEIPT
            ),
            quantity=Decimal("1.0000"),
            quantity_before=Decimal("0.0000"),
            quantity_after=Decimal("1.0000"),
            unit_cost=Decimal("55.00"),
            user=self.user,
        )

        self.assertEqual(
            entry.serial_number,
            serial,
        )
        self.assertIsNone(entry.batch)
        self.assertEqual(
            entry.quantity,
            Decimal("1.0000"),
        )

    def test_tracking_entry_rejects_batch_and_serial_together(self):
        batch = create_inventory_batch(
            company=self.company,
            item=self.batch_product,
            batch_number="DOUBLE-TARGET-BATCH",
            expiry_date=(
                timezone.localdate()
                + timedelta(days=365)
            ),
            user=self.user,
        )

        serial = register_inventory_serial_number(
            company=self.company,
            item=self.serial_product,
            warehouse=self.warehouse,
            location=self.location,
            stock_item=self.serial_stock_item,
            serial_number="DOUBLE-TARGET-SERIAL",
            user=self.user,
        )

        with self.assertRaises(ValidationError) as context:
            create_inventory_tracking_entry(
                company=self.company,
                item=self.batch_product,
                warehouse=self.warehouse,
                location=self.location,
                stock_item=self.batch_stock_item,
                batch=batch,
                serial_number=serial,
                entry_type=(
                    InventoryTrackingEntryType.RECEIPT
                ),
                quantity=Decimal("1.0000"),
                user=self.user,
            )

        self.assertIn(
            "tracking",
            context.exception.message_dict,
        )

    def test_tracking_querysets_are_company_scoped(self):
        batch = create_inventory_batch(
            company=self.company,
            item=self.batch_product,
            batch_number="QUERYSET-BATCH",
            expiry_date=(
                timezone.localdate()
                + timedelta(days=365)
            ),
            user=self.user,
        )

        balance = get_or_create_inventory_batch_balance(
            company=self.company,
            warehouse=self.warehouse,
            location=self.location,
            item=self.batch_product,
            batch=batch,
            stock_item=self.batch_stock_item,
            user=self.user,
        )

        serial = register_inventory_serial_number(
            company=self.company,
            item=self.serial_product,
            warehouse=self.warehouse,
            location=self.location,
            stock_item=self.serial_stock_item,
            serial_number="QUERYSET-SERIAL",
            user=self.user,
        )

        entry = create_inventory_tracking_entry(
            company=self.company,
            item=self.serial_product,
            warehouse=self.warehouse,
            location=self.location,
            stock_item=self.serial_stock_item,
            serial_number=serial,
            entry_type=(
                InventoryTrackingEntryType.RECEIPT
            ),
            quantity=Decimal("1.0000"),
            user=self.user,
        )

        self.assertIn(
            batch,
            get_company_inventory_batches(
                self.company
            ),
        )
        self.assertIn(
            balance,
            get_company_inventory_batch_balances(
                self.company
            ),
        )
        self.assertIn(
            serial,
            get_company_inventory_serial_numbers(
                self.company
            ),
        )
        self.assertIn(
            entry,
            get_company_inventory_tracking_entries(
                self.company
            ),
        )

        self.assertNotIn(
            batch,
            get_company_inventory_batches(
                self.other_company
            ),
        )
        self.assertNotIn(
            serial,
            get_company_inventory_serial_numbers(
                self.other_company
            ),
        )
        self.assertNotIn(
            entry,
            get_company_inventory_tracking_entries(
                self.other_company
            ),
        )


class InventoryTrackedStockMovementIntegrationTests(
    InventoryTestBase
):
    """
    Phase 22.2.2.2 batch and serial stock movement integration tests.
    """

    def setUp(self):
        super().setUp()

        self.location = create_inventory_location(
            company=self.company,
            warehouse=self.warehouse,
            data={
                "code": "TRACKED-MOVEMENT-BIN",
                "name": "Tracked Movement Bin",
                "location_type": InventoryLocationType.BIN,
                "is_default": True,
                "is_pickable": True,
            },
            user=self.user,
        )

        self.batch_product = CatalogItem.objects.create(
            company=self.company,
            unit=self.unit,
            item_type=CatalogItemType.PRODUCT,
            code="TRACKED-BATCH-ITEM",
            sku="TRACKED-BATCH-SKU",
            barcode="TRACKED-BATCH-BAR",
            name="Tracked Batch Product",
            purchase_price=Decimal("14.00"),
            cost_price=Decimal("14.00"),
            sale_price=Decimal("24.00"),
            track_inventory=True,
            inventory_tracking_method=(
                CatalogItemTrackingMethod.BATCH
            ),
            track_expiry_dates=True,
            is_purchasable=True,
            is_sellable=True,
        )

        self.serial_product = CatalogItem.objects.create(
            company=self.company,
            unit=self.unit,
            item_type=CatalogItemType.PRODUCT,
            code="TRACKED-SERIAL-ITEM",
            sku="TRACKED-SERIAL-SKU",
            barcode="TRACKED-SERIAL-BAR",
            name="Tracked Serial Product",
            purchase_price=Decimal("65.00"),
            cost_price=Decimal("65.00"),
            sale_price=Decimal("90.00"),
            track_inventory=True,
            inventory_tracking_method=(
                CatalogItemTrackingMethod.SERIAL
            ),
            track_expiry_dates=False,
            is_purchasable=True,
            is_sellable=True,
        )

    def _create_batch(
        self,
        *,
        batch_number="TRACKED-BATCH-001",
        expiry_days=365,
    ):
        return create_inventory_batch(
            company=self.company,
            item=self.batch_product,
            batch_number=batch_number,
            manufactured_at=timezone.localdate(),
            expiry_date=(
                timezone.localdate()
                + timedelta(days=expiry_days)
            ),
            user=self.user,
        )

    def test_receive_batch_stock_updates_general_and_batch_balance(self):
        batch = self._create_batch()

        movement = receive_batch_stock(
            company=self.company,
            warehouse=self.warehouse,
            location=self.location,
            item=self.batch_product,
            batch=batch,
            quantity=Decimal("10.0000"),
            unit_cost=Decimal("14.00"),
            reference_type="test_receipt",
            reference_id=501,
            reference_number="BATCH-REC-001",
            user=self.user,
            post_accounting=False,
        )

        stock_item = StockItem.objects.get(
            company=self.company,
            warehouse=self.warehouse,
            location=self.location,
            item=self.batch_product,
        )
        batch_balance = InventoryBatchBalance.objects.get(
            company=self.company,
            warehouse=self.warehouse,
            location=self.location,
            item=self.batch_product,
            batch=batch,
        )

        self.assertEqual(
            movement.status,
            StockMovementStatus.POSTED,
        )
        self.assertEqual(
            movement.movement_type,
            StockMovementType.IN,
        )
        self.assertEqual(
            stock_item.quantity_on_hand,
            Decimal("10.0000"),
        )
        self.assertEqual(
            batch_balance.quantity_on_hand,
            Decimal("10.0000"),
        )
        self.assertEqual(
            batch_balance.average_cost,
            Decimal("14.00"),
        )

    def test_receive_batch_stock_creates_tracking_entry(self):
        batch = self._create_batch(
            batch_number="TRACKED-BATCH-ENTRY",
        )

        movement = receive_batch_stock(
            company=self.company,
            warehouse=self.warehouse,
            location=self.location,
            item=self.batch_product,
            batch=batch,
            quantity="6",
            unit_cost="14.00",
            reference_number="BATCH-ENTRY-REC",
            user=self.user,
            post_accounting=False,
        )

        entry = InventoryTrackingEntry.objects.get(
            company=self.company,
            stock_movement=movement,
            batch=batch,
        )

        self.assertEqual(
            entry.entry_type,
            InventoryTrackingEntryType.RECEIPT,
        )
        self.assertEqual(
            entry.direction,
            StockMovementDirection.INCREASE,
        )
        self.assertEqual(
            entry.quantity,
            Decimal("6.0000"),
        )
        self.assertEqual(
            entry.quantity_before,
            Decimal("0.0000"),
        )
        self.assertEqual(
            entry.quantity_after,
            Decimal("6.0000"),
        )

    def test_issue_batch_stock_updates_both_balances(self):
        batch = self._create_batch(
            batch_number="TRACKED-BATCH-ISSUE",
        )

        receive_batch_stock(
            company=self.company,
            warehouse=self.warehouse,
            location=self.location,
            item=self.batch_product,
            batch=batch,
            quantity="10",
            unit_cost="14.00",
            user=self.user,
            post_accounting=False,
        )

        movement = issue_batch_stock(
            company=self.company,
            warehouse=self.warehouse,
            location=self.location,
            item=self.batch_product,
            batch=batch,
            quantity="4",
            reference_number="BATCH-ISSUE-001",
            user=self.user,
            post_accounting=False,
        )

        stock_item = StockItem.objects.get(
            company=self.company,
            warehouse=self.warehouse,
            location=self.location,
            item=self.batch_product,
        )
        batch_balance = InventoryBatchBalance.objects.get(
            company=self.company,
            warehouse=self.warehouse,
            location=self.location,
            item=self.batch_product,
            batch=batch,
        )
        entry = InventoryTrackingEntry.objects.get(
            stock_movement=movement,
            batch=batch,
        )

        self.assertEqual(
            stock_item.quantity_on_hand,
            Decimal("6.0000"),
        )
        self.assertEqual(
            batch_balance.quantity_on_hand,
            Decimal("6.0000"),
        )
        self.assertEqual(
            entry.entry_type,
            InventoryTrackingEntryType.ISSUE,
        )
        self.assertEqual(
            entry.quantity_before,
            Decimal("10.0000"),
        )
        self.assertEqual(
            entry.quantity_after,
            Decimal("6.0000"),
        )

    def test_issue_batch_stock_rejects_insufficient_batch_balance(self):
        batch = self._create_batch(
            batch_number="TRACKED-BATCH-LIMIT",
        )

        receive_batch_stock(
            company=self.company,
            warehouse=self.warehouse,
            location=self.location,
            item=self.batch_product,
            batch=batch,
            quantity="2",
            unit_cost="14.00",
            user=self.user,
            post_accounting=False,
        )

        movement_count_before = StockMovement.objects.count()
        tracking_count_before = (
            InventoryTrackingEntry.objects.count()
        )

        with self.assertRaises(ValidationError):
            issue_batch_stock(
                company=self.company,
                warehouse=self.warehouse,
                location=self.location,
                item=self.batch_product,
                batch=batch,
                quantity="3",
                user=self.user,
                post_accounting=False,
            )

        stock_item = StockItem.objects.get(
            company=self.company,
            warehouse=self.warehouse,
            location=self.location,
            item=self.batch_product,
        )
        batch_balance = InventoryBatchBalance.objects.get(
            company=self.company,
            warehouse=self.warehouse,
            location=self.location,
            item=self.batch_product,
            batch=batch,
        )

        self.assertEqual(
            stock_item.quantity_on_hand,
            Decimal("2.0000"),
        )
        self.assertEqual(
            batch_balance.quantity_on_hand,
            Decimal("2.0000"),
        )
        self.assertEqual(
            StockMovement.objects.count(),
            movement_count_before,
        )
        self.assertEqual(
            InventoryTrackingEntry.objects.count(),
            tracking_count_before,
        )

    def test_issue_batch_stock_rejects_expired_batch(self):
        batch = create_inventory_batch(
            company=self.company,
            item=self.batch_product,
            batch_number="TRACKED-EXPIRED-BATCH",
            manufactured_at=(
                timezone.localdate()
                - timedelta(days=30)
            ),
            expiry_date=(
                timezone.localdate()
                - timedelta(days=1)
            ),
            user=self.user,
        )

        self.assertEqual(
            batch.status,
            InventoryBatchStatus.EXPIRED,
        )

        with self.assertRaises(ValidationError):
            issue_batch_stock(
                company=self.company,
                warehouse=self.warehouse,
                location=self.location,
                item=self.batch_product,
                batch=batch,
                quantity="1",
                user=self.user,
                post_accounting=False,
            )

        self.assertFalse(
            StockMovement.objects.filter(
                company=self.company,
                item=self.batch_product,
                movement_type=StockMovementType.OUT,
            ).exists()
        )

    def test_full_batch_issue_marks_batch_depleted(self):
        batch = self._create_batch(
            batch_number="TRACKED-BATCH-DEPLETE",
        )

        receive_batch_stock(
            company=self.company,
            warehouse=self.warehouse,
            location=self.location,
            item=self.batch_product,
            batch=batch,
            quantity="5",
            unit_cost="14.00",
            user=self.user,
            post_accounting=False,
        )

        issue_batch_stock(
            company=self.company,
            warehouse=self.warehouse,
            location=self.location,
            item=self.batch_product,
            batch=batch,
            quantity="5",
            user=self.user,
            post_accounting=False,
        )

        batch.refresh_from_db()

        batch_balance = InventoryBatchBalance.objects.get(
            company=self.company,
            batch=batch,
            location=self.location,
        )

        self.assertEqual(
            batch_balance.quantity_on_hand,
            Decimal("0.0000"),
        )
        self.assertEqual(
            batch.status,
            InventoryBatchStatus.DEPLETED,
        )

    def test_receive_serial_stock_creates_one_record_per_unit(self):
        movement = receive_serial_stock(
            company=self.company,
            warehouse=self.warehouse,
            location=self.location,
            item=self.serial_product,
            serial_numbers=[
                "tracked-serial-001",
                "tracked-serial-002",
                "tracked-serial-003",
            ],
            unit_cost="65.00",
            reference_number="SERIAL-REC-001",
            user=self.user,
            post_accounting=False,
        )

        stock_item = StockItem.objects.get(
            company=self.company,
            warehouse=self.warehouse,
            location=self.location,
            item=self.serial_product,
        )
        serials = InventorySerialNumber.objects.filter(
            company=self.company,
            item=self.serial_product,
        )
        entries = InventoryTrackingEntry.objects.filter(
            company=self.company,
            stock_movement=movement,
            entry_type=(
                InventoryTrackingEntryType.RECEIPT
            ),
        )

        self.assertEqual(
            movement.quantity,
            Decimal("3.0000"),
        )
        self.assertEqual(
            stock_item.quantity_on_hand,
            Decimal("3.0000"),
        )
        self.assertEqual(serials.count(), 3)
        self.assertEqual(entries.count(), 3)

        self.assertTrue(
            serials.filter(
                serial_number="TRACKED-SERIAL-001",
                status=InventorySerialStatus.AVAILABLE,
                warehouse=self.warehouse,
                location=self.location,
                stock_item=stock_item,
            ).exists()
        )

    def test_receive_serial_stock_rejects_duplicate_input_atomically(self):
        movement_count_before = StockMovement.objects.count()
        stock_count_before = StockItem.objects.filter(
            company=self.company,
            item=self.serial_product,
        ).count()

        with self.assertRaises(ValidationError):
            receive_serial_stock(
                company=self.company,
                warehouse=self.warehouse,
                location=self.location,
                item=self.serial_product,
                serial_numbers=[
                    "duplicate-serial",
                    "DUPLICATE-SERIAL",
                ],
                unit_cost="65.00",
                user=self.user,
                post_accounting=False,
            )

        self.assertEqual(
            StockMovement.objects.count(),
            movement_count_before,
        )
        self.assertEqual(
            InventorySerialNumber.objects.filter(
                company=self.company,
                item=self.serial_product,
            ).count(),
            0,
        )
        self.assertEqual(
            StockItem.objects.filter(
                company=self.company,
                item=self.serial_product,
            ).count(),
            stock_count_before,
        )

    def test_receive_serial_stock_rejects_existing_company_serial(self):
        receive_serial_stock(
            company=self.company,
            warehouse=self.warehouse,
            location=self.location,
            item=self.serial_product,
            serial_numbers=["EXISTING-SERIAL-001"],
            unit_cost="65.00",
            user=self.user,
            post_accounting=False,
        )

        movement_count_before = StockMovement.objects.count()

        with self.assertRaises(ValidationError):
            receive_serial_stock(
                company=self.company,
                warehouse=self.warehouse,
                location=self.location,
                item=self.serial_product,
                serial_numbers=[
                    "EXISTING-SERIAL-001",
                    "NEW-SERIAL-002",
                ],
                unit_cost="65.00",
                user=self.user,
                post_accounting=False,
            )

        self.assertEqual(
            StockMovement.objects.count(),
            movement_count_before,
        )
        self.assertFalse(
            InventorySerialNumber.objects.filter(
                company=self.company,
                serial_number="NEW-SERIAL-002",
            ).exists()
        )

    def test_issue_serial_stock_updates_status_and_general_balance(self):
        receive_movement = receive_serial_stock(
            company=self.company,
            warehouse=self.warehouse,
            location=self.location,
            item=self.serial_product,
            serial_numbers=[
                "ISSUE-SERIAL-001",
                "ISSUE-SERIAL-002",
                "ISSUE-SERIAL-003",
            ],
            unit_cost="65.00",
            user=self.user,
            post_accounting=False,
        )

        serials = list(
            InventorySerialNumber.objects.filter(
                company=self.company,
                serial_number__in=[
                    "ISSUE-SERIAL-001",
                    "ISSUE-SERIAL-002",
                ],
            ).order_by("serial_number")
        )

        movement = issue_serial_stock(
            company=self.company,
            warehouse=self.warehouse,
            location=self.location,
            item=self.serial_product,
            serial_numbers=serials,
            reference_number="SERIAL-ISSUE-001",
            user=self.user,
            post_accounting=False,
        )

        stock_item = receive_movement.stock_item
        stock_item.refresh_from_db()

        self.assertEqual(
            movement.quantity,
            Decimal("2.0000"),
        )
        self.assertEqual(
            stock_item.quantity_on_hand,
            Decimal("1.0000"),
        )

        for serial in serials:
            serial.refresh_from_db()

            self.assertEqual(
                serial.status,
                InventorySerialStatus.ISSUED,
            )
            self.assertIsNone(serial.warehouse)
            self.assertIsNone(serial.location)
            self.assertIsNone(serial.stock_item)
            self.assertIsNotNone(serial.issued_at)

        self.assertEqual(
            InventoryTrackingEntry.objects.filter(
                stock_movement=movement,
                entry_type=(
                    InventoryTrackingEntryType.ISSUE
                ),
            ).count(),
            2,
        )

    def test_issue_serial_stock_rejects_serial_from_other_location(self):
        second_location = create_inventory_location(
            company=self.company,
            warehouse=self.warehouse,
            data={
                "code": "TRACKED-SECOND-BIN",
                "name": "Tracked Second Bin",
                "location_type": InventoryLocationType.BIN,
                "is_pickable": True,
            },
            user=self.user,
        )

        receive_serial_stock(
            company=self.company,
            warehouse=self.warehouse,
            location=second_location,
            item=self.serial_product,
            serial_numbers=[
                "OTHER-LOCATION-SERIAL",
            ],
            unit_cost="65.00",
            user=self.user,
            post_accounting=False,
        )

        serial = InventorySerialNumber.objects.get(
            company=self.company,
            serial_number="OTHER-LOCATION-SERIAL",
        )

        movement_count_before = StockMovement.objects.count()

        with self.assertRaises(ValidationError):
            issue_serial_stock(
                company=self.company,
                warehouse=self.warehouse,
                location=self.location,
                item=self.serial_product,
                serial_numbers=[serial],
                user=self.user,
                post_accounting=False,
            )

        serial.refresh_from_db()

        self.assertEqual(
            serial.status,
            InventorySerialStatus.AVAILABLE,
        )
        self.assertEqual(
            serial.location,
            second_location,
        )
        self.assertEqual(
            StockMovement.objects.count(),
            movement_count_before,
        )

    def test_issue_serial_stock_rejects_duplicate_serial_instances(self):
        receive_serial_stock(
            company=self.company,
            warehouse=self.warehouse,
            location=self.location,
            item=self.serial_product,
            serial_numbers=["DUPLICATE-INSTANCE-SERIAL"],
            unit_cost="65.00",
            user=self.user,
            post_accounting=False,
        )

        serial = InventorySerialNumber.objects.get(
            company=self.company,
            serial_number="DUPLICATE-INSTANCE-SERIAL",
        )

        movement_count_before = StockMovement.objects.count()

        with self.assertRaises(ValidationError):
            issue_serial_stock(
                company=self.company,
                warehouse=self.warehouse,
                location=self.location,
                item=self.serial_product,
                serial_numbers=[serial, serial],
                user=self.user,
                post_accounting=False,
            )

        serial.refresh_from_db()

        self.assertEqual(
            serial.status,
            InventorySerialStatus.AVAILABLE,
        )
        self.assertEqual(
            StockMovement.objects.count(),
            movement_count_before,
        )


class InventoryTrackedTransferIntegrationTests(
    InventoryTestBase
):
    """
    Phase 22.2.2.3 tracked batch and serial transfer tests.
    """

    def setUp(self):
        super().setUp()

        self.source_location = create_inventory_location(
            company=self.company,
            warehouse=self.warehouse,
            data={
                "code": "TRACK-TRANSFER-SOURCE",
                "name": "Tracked Transfer Source",
                "location_type": InventoryLocationType.BIN,
                "is_default": True,
                "is_pickable": True,
            },
            user=self.user,
        )

        self.same_warehouse_target = (
            create_inventory_location(
                company=self.company,
                warehouse=self.warehouse,
                data={
                    "code": "TRACK-TRANSFER-INTERNAL",
                    "name": "Tracked Internal Target",
                    "location_type": (
                        InventoryLocationType.BIN
                    ),
                    "is_pickable": True,
                },
                user=self.user,
            )
        )

        self.target_location = create_inventory_location(
            company=self.company,
            warehouse=self.second_warehouse,
            data={
                "code": "TRACK-TRANSFER-TARGET",
                "name": "Tracked Transfer Target",
                "location_type": InventoryLocationType.BIN,
                "is_default": True,
                "is_pickable": True,
            },
            user=self.user,
        )

        self.batch_product = CatalogItem.objects.create(
            company=self.company,
            unit=self.unit,
            item_type=CatalogItemType.PRODUCT,
            code="TRANSFER-BATCH-ITEM",
            sku="TRANSFER-BATCH-SKU",
            barcode="TRANSFER-BATCH-BAR",
            name="Transfer Batch Product",
            purchase_price=Decimal("18.00"),
            cost_price=Decimal("18.00"),
            sale_price=Decimal("28.00"),
            track_inventory=True,
            inventory_tracking_method=(
                CatalogItemTrackingMethod.BATCH
            ),
            track_expiry_dates=True,
            is_purchasable=True,
            is_sellable=True,
        )

        self.serial_product = CatalogItem.objects.create(
            company=self.company,
            unit=self.unit,
            item_type=CatalogItemType.PRODUCT,
            code="TRANSFER-SERIAL-ITEM",
            sku="TRANSFER-SERIAL-SKU",
            barcode="TRANSFER-SERIAL-BAR",
            name="Transfer Serial Product",
            purchase_price=Decimal("70.00"),
            cost_price=Decimal("70.00"),
            sale_price=Decimal("100.00"),
            track_inventory=True,
            inventory_tracking_method=(
                CatalogItemTrackingMethod.SERIAL
            ),
            track_expiry_dates=False,
            is_purchasable=True,
            is_sellable=True,
        )

    def _create_batch(
        self,
        batch_number="TRANSFER-BATCH-001",
    ):
        return create_inventory_batch(
            company=self.company,
            item=self.batch_product,
            batch_number=batch_number,
            manufactured_at=timezone.localdate(),
            expiry_date=(
                timezone.localdate()
                + timedelta(days=365)
            ),
            user=self.user,
        )

    def test_transfer_batch_between_warehouses_updates_balances(self):
        batch = self._create_batch()

        receive_batch_stock(
            company=self.company,
            warehouse=self.warehouse,
            location=self.source_location,
            item=self.batch_product,
            batch=batch,
            quantity="10",
            unit_cost="18.00",
            user=self.user,
            post_accounting=False,
        )

        result = transfer_batch_stock(
            company=self.company,
            source_warehouse=self.warehouse,
            target_warehouse=self.second_warehouse,
            source_location=self.source_location,
            target_location=self.target_location,
            item=self.batch_product,
            batch=batch,
            quantity="4",
            reference_number="BATCH-TRANSFER-001",
            user=self.user,
        )

        source_stock = StockItem.objects.get(
            company=self.company,
            warehouse=self.warehouse,
            location=self.source_location,
            item=self.batch_product,
        )
        target_stock = StockItem.objects.get(
            company=self.company,
            warehouse=self.second_warehouse,
            location=self.target_location,
            item=self.batch_product,
        )
        source_batch = InventoryBatchBalance.objects.get(
            company=self.company,
            warehouse=self.warehouse,
            location=self.source_location,
            batch=batch,
        )
        target_batch = InventoryBatchBalance.objects.get(
            company=self.company,
            warehouse=self.second_warehouse,
            location=self.target_location,
            batch=batch,
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
            source_batch.quantity_on_hand,
            Decimal("6.0000"),
        )
        self.assertEqual(
            target_batch.quantity_on_hand,
            Decimal("4.0000"),
        )
        self.assertEqual(
            result["outgoing"].movement_type,
            StockMovementType.TRANSFER_OUT,
        )
        self.assertEqual(
            result["incoming"].movement_type,
            StockMovementType.TRANSFER_IN,
        )

    def test_transfer_batch_creates_tracking_entries(self):
        batch = self._create_batch(
            "TRANSFER-BATCH-TRACKING"
        )

        receive_batch_stock(
            company=self.company,
            warehouse=self.warehouse,
            location=self.source_location,
            item=self.batch_product,
            batch=batch,
            quantity="8",
            unit_cost="18.00",
            user=self.user,
            post_accounting=False,
        )

        result = transfer_batch_stock(
            company=self.company,
            source_warehouse=self.warehouse,
            target_warehouse=self.second_warehouse,
            source_location=self.source_location,
            target_location=self.target_location,
            item=self.batch_product,
            batch=batch,
            quantity="3",
            reference_number="BATCH-TRACK-001",
            user=self.user,
        )

        outgoing_entry = InventoryTrackingEntry.objects.get(
            stock_movement=result["outgoing"],
            batch=batch,
        )
        incoming_entry = InventoryTrackingEntry.objects.get(
            stock_movement=result["incoming"],
            batch=batch,
        )

        self.assertEqual(
            outgoing_entry.entry_type,
            InventoryTrackingEntryType.TRANSFER_OUT,
        )
        self.assertEqual(
            outgoing_entry.quantity_before,
            Decimal("8.0000"),
        )
        self.assertEqual(
            outgoing_entry.quantity_after,
            Decimal("5.0000"),
        )
        self.assertEqual(
            incoming_entry.entry_type,
            InventoryTrackingEntryType.TRANSFER_IN,
        )
        self.assertEqual(
            incoming_entry.quantity_before,
            Decimal("0.0000"),
        )
        self.assertEqual(
            incoming_entry.quantity_after,
            Decimal("3.0000"),
        )

    def test_transfer_batch_inside_same_warehouse(self):
        batch = self._create_batch(
            "TRANSFER-BATCH-INTERNAL"
        )

        receive_batch_stock(
            company=self.company,
            warehouse=self.warehouse,
            location=self.source_location,
            item=self.batch_product,
            batch=batch,
            quantity="7",
            unit_cost="18.00",
            user=self.user,
            post_accounting=False,
        )

        transfer_batch_stock(
            company=self.company,
            source_warehouse=self.warehouse,
            target_warehouse=self.warehouse,
            source_location=self.source_location,
            target_location=self.same_warehouse_target,
            item=self.batch_product,
            batch=batch,
            quantity="2",
            user=self.user,
        )

        source_balance = InventoryBatchBalance.objects.get(
            company=self.company,
            location=self.source_location,
            batch=batch,
        )
        target_balance = InventoryBatchBalance.objects.get(
            company=self.company,
            location=self.same_warehouse_target,
            batch=batch,
        )

        self.assertEqual(
            source_balance.quantity_on_hand,
            Decimal("5.0000"),
        )
        self.assertEqual(
            target_balance.quantity_on_hand,
            Decimal("2.0000"),
        )

    def test_transfer_batch_rejects_insufficient_quantity_atomically(self):
        batch = self._create_batch(
            "TRANSFER-BATCH-LIMIT"
        )

        receive_batch_stock(
            company=self.company,
            warehouse=self.warehouse,
            location=self.source_location,
            item=self.batch_product,
            batch=batch,
            quantity="2",
            unit_cost="18.00",
            user=self.user,
            post_accounting=False,
        )

        movement_count = StockMovement.objects.count()
        entry_count = InventoryTrackingEntry.objects.count()

        with self.assertRaises(ValidationError):
            transfer_batch_stock(
                company=self.company,
                source_warehouse=self.warehouse,
                target_warehouse=self.second_warehouse,
                source_location=self.source_location,
                target_location=self.target_location,
                item=self.batch_product,
                batch=batch,
                quantity="3",
                user=self.user,
            )

        source_balance = InventoryBatchBalance.objects.get(
            company=self.company,
            location=self.source_location,
            batch=batch,
        )

        self.assertEqual(
            source_balance.quantity_on_hand,
            Decimal("2.0000"),
        )
        self.assertEqual(
            StockMovement.objects.count(),
            movement_count,
        )
        self.assertEqual(
            InventoryTrackingEntry.objects.count(),
            entry_count,
        )
        self.assertFalse(
            InventoryBatchBalance.objects.filter(
                company=self.company,
                location=self.target_location,
                batch=batch,
            ).exists()
        )

    def test_transfer_batch_rejects_same_location(self):
        batch = self._create_batch(
            "TRANSFER-BATCH-SAME"
        )

        receive_batch_stock(
            company=self.company,
            warehouse=self.warehouse,
            location=self.source_location,
            item=self.batch_product,
            batch=batch,
            quantity="2",
            unit_cost="18.00",
            user=self.user,
            post_accounting=False,
        )

        with self.assertRaises(ValidationError):
            transfer_batch_stock(
                company=self.company,
                source_warehouse=self.warehouse,
                target_warehouse=self.warehouse,
                source_location=self.source_location,
                target_location=self.source_location,
                item=self.batch_product,
                batch=batch,
                quantity="1",
                user=self.user,
            )

    def test_transfer_serial_updates_current_position(self):
        receive_serial_stock(
            company=self.company,
            warehouse=self.warehouse,
            location=self.source_location,
            item=self.serial_product,
            serial_numbers=[
                "TRANSFER-SERIAL-001",
                "TRANSFER-SERIAL-002",
            ],
            unit_cost="70.00",
            user=self.user,
            post_accounting=False,
        )

        serials = list(
            InventorySerialNumber.objects.filter(
                company=self.company,
                serial_number__in=[
                    "TRANSFER-SERIAL-001",
                    "TRANSFER-SERIAL-002",
                ],
            ).order_by("id")
        )

        result = transfer_serial_stock(
            company=self.company,
            source_warehouse=self.warehouse,
            target_warehouse=self.second_warehouse,
            source_location=self.source_location,
            target_location=self.target_location,
            item=self.serial_product,
            serial_numbers=serials,
            reference_number="SERIAL-TRANSFER-001",
            user=self.user,
        )

        source_stock = StockItem.objects.get(
            company=self.company,
            warehouse=self.warehouse,
            location=self.source_location,
            item=self.serial_product,
        )
        target_stock = StockItem.objects.get(
            company=self.company,
            warehouse=self.second_warehouse,
            location=self.target_location,
            item=self.serial_product,
        )

        self.assertEqual(
            source_stock.quantity_on_hand,
            Decimal("0.0000"),
        )
        self.assertEqual(
            target_stock.quantity_on_hand,
            Decimal("2.0000"),
        )

        for serial in serials:
            serial.refresh_from_db()

            self.assertEqual(
                serial.status,
                InventorySerialStatus.AVAILABLE,
            )
            self.assertEqual(
                serial.warehouse,
                self.second_warehouse,
            )
            self.assertEqual(
                serial.location,
                self.target_location,
            )
            self.assertEqual(
                serial.stock_item,
                target_stock,
            )

        self.assertEqual(
            result["outgoing"].movement_type,
            StockMovementType.TRANSFER_OUT,
        )
        self.assertEqual(
            result["incoming"].movement_type,
            StockMovementType.TRANSFER_IN,
        )

    def test_transfer_serial_creates_two_entries_per_serial(self):
        receive_serial_stock(
            company=self.company,
            warehouse=self.warehouse,
            location=self.source_location,
            item=self.serial_product,
            serial_numbers=[
                "TRANSFER-ENTRY-SERIAL-001",
                "TRANSFER-ENTRY-SERIAL-002",
            ],
            unit_cost="70.00",
            user=self.user,
            post_accounting=False,
        )

        serials = list(
            InventorySerialNumber.objects.filter(
                company=self.company,
                item=self.serial_product,
            ).order_by("id")
        )

        result = transfer_serial_stock(
            company=self.company,
            source_warehouse=self.warehouse,
            target_warehouse=self.second_warehouse,
            source_location=self.source_location,
            target_location=self.target_location,
            item=self.serial_product,
            serial_numbers=serials,
            user=self.user,
        )

        outgoing_entries = InventoryTrackingEntry.objects.filter(
            stock_movement=result["outgoing"],
            entry_type=(
                InventoryTrackingEntryType.TRANSFER_OUT
            ),
        )
        incoming_entries = InventoryTrackingEntry.objects.filter(
            stock_movement=result["incoming"],
            entry_type=(
                InventoryTrackingEntryType.TRANSFER_IN
            ),
        )

        self.assertEqual(outgoing_entries.count(), 2)
        self.assertEqual(incoming_entries.count(), 2)

    def test_transfer_serial_rejects_wrong_source_location(self):
        receive_serial_stock(
            company=self.company,
            warehouse=self.warehouse,
            location=self.source_location,
            item=self.serial_product,
            serial_numbers=["WRONG-SOURCE-SERIAL"],
            unit_cost="70.00",
            user=self.user,
            post_accounting=False,
        )

        serial = InventorySerialNumber.objects.get(
            company=self.company,
            serial_number="WRONG-SOURCE-SERIAL",
        )

        movement_count = StockMovement.objects.count()

        with self.assertRaises(ValidationError):
            transfer_serial_stock(
                company=self.company,
                source_warehouse=self.warehouse,
                target_warehouse=self.second_warehouse,
                source_location=self.same_warehouse_target,
                target_location=self.target_location,
                item=self.serial_product,
                serial_numbers=[serial],
                user=self.user,
            )

        serial.refresh_from_db()

        self.assertEqual(
            serial.location,
            self.source_location,
        )
        self.assertEqual(
            serial.status,
            InventorySerialStatus.AVAILABLE,
        )
        self.assertEqual(
            StockMovement.objects.count(),
            movement_count,
        )

    def test_tracked_transfers_do_not_create_gl_entries(self):
        batch = self._create_batch(
            "TRANSFER-NO-GL-BATCH"
        )

        receive_batch_stock(
            company=self.company,
            warehouse=self.warehouse,
            location=self.source_location,
            item=self.batch_product,
            batch=batch,
            quantity="3",
            unit_cost="18.00",
            user=self.user,
            post_accounting=False,
        )

        result = transfer_batch_stock(
            company=self.company,
            source_warehouse=self.warehouse,
            target_warehouse=self.second_warehouse,
            source_location=self.source_location,
            target_location=self.target_location,
            item=self.batch_product,
            batch=batch,
            quantity="1",
            user=self.user,
        )

        self.assertIsNone(
            post_stock_movement_to_accounting(
                result["outgoing"],
                actor=self.user,
                auto_post=True,
            )
        )
        self.assertIsNone(
            post_stock_movement_to_accounting(
                result["incoming"],
                actor=self.user,
                auto_post=True,
            )
        )

        self.assertFalse(
            JournalEntry.objects.filter(
                company=self.company,
                source_type="stock_movement",
                source_id__in=[
                    str(result["outgoing"].id),
                    str(result["incoming"].id),
                ],
            ).exists()
        )

# ============================================================
# Phase 22.3.1 Stock Reservation Models Foundation Tests
# ============================================================


class StockReservationModelTests(InventoryTestBase):
    """
    Phase 22.3.1 stock reservation model foundation tests.

    These tests validate ownership, allocation consistency,
    quantities, and the rule that models do not mutate stock
    balances directly.
    """

    def setUp(self):
        super().setUp()

        self.location = create_inventory_location(
            company=self.company,
            warehouse=self.warehouse,
            data={
                "code": "RESERVATION-BIN-001",
                "name": "Reservation Bin 001",
                "location_type": InventoryLocationType.BIN,
                "is_default": True,
                "is_pickable": True,
            },
            user=self.user,
        )

        self.stock_item = get_or_create_stock_item(
            company=self.company,
            warehouse=self.warehouse,
            location=self.location,
            item=self.product,
            user=self.user,
        )

        self.order = create_sales_order(
            company=self.company,
            user=self.user,
            branch_id=self.branch.id,
            items=[
                {
                    "catalog_item_id": self.product.id,
                    "quantity": "5.0000",
                }
            ],
        )

        self.order_item = self.order.items.get()

    def _create_reservation(
        self,
        *,
        company=None,
        sales_order=None,
        reservation_number="RSV-2026-000001",
        requested_quantity="5.0000",
        reserved_quantity="0.0000",
        fulfilled_quantity="0.0000",
        released_quantity="0.0000",
        status=StockReservationStatus.DRAFT,
    ):
        return StockReservation.objects.create(
            company=company or self.company,
            sales_order=sales_order or self.order,
            reservation_number=reservation_number,
            status=status,
            source=StockReservationSource.SALES_ORDER,
            requested_quantity=Decimal(
                requested_quantity
            ),
            reserved_quantity=Decimal(
                reserved_quantity
            ),
            fulfilled_quantity=Decimal(
                fulfilled_quantity
            ),
            released_quantity=Decimal(
                released_quantity
            ),
            created_by=self.user,
            updated_by=self.user,
        )

    def test_create_stock_reservation_header(self):
        reservation = self._create_reservation()

        self.assertEqual(
            reservation.company,
            self.company,
        )
        self.assertEqual(
            reservation.sales_order,
            self.order,
        )
        self.assertEqual(
            reservation.status,
            StockReservationStatus.DRAFT,
        )
        self.assertEqual(
            reservation.source,
            StockReservationSource.SALES_ORDER,
        )
        self.assertEqual(
            reservation.requested_quantity,
            Decimal("5.0000"),
        )
        self.assertEqual(
            reservation.unallocated_quantity,
            Decimal("5.0000"),
        )
        self.assertEqual(
            reservation.remaining_reserved_quantity,
            Decimal("0.0000"),
        )

    def test_reservation_rejects_other_company_order(self):
        other_order = create_sales_order(
            company=self.other_company,
            user=self.user,
            branch_id=self.other_branch.id,
            items=[
                {
                    "catalog_item_id": self.other_product.id,
                    "quantity": "1.0000",
                }
            ],
        )

        reservation = StockReservation(
            company=self.company,
            sales_order=other_order,
            reservation_number="RSV-CROSS-COMPANY",
            requested_quantity=Decimal("1.0000"),
        )

        with self.assertRaises(ValidationError):
            reservation.full_clean()

    def test_reservation_rejects_reserved_above_requested(self):
        reservation = StockReservation(
            company=self.company,
            sales_order=self.order,
            reservation_number="RSV-OVER-REQUESTED",
            requested_quantity=Decimal("2.0000"),
            reserved_quantity=Decimal("3.0000"),
        )

        with self.assertRaises(ValidationError):
            reservation.full_clean()

    def test_reservation_quantity_properties(self):
        reservation = self._create_reservation(
            requested_quantity="5.0000",
            reserved_quantity="4.0000",
            fulfilled_quantity="1.0000",
            released_quantity="1.0000",
            status=(
                StockReservationStatus
                .PARTIALLY_FULFILLED
            ),
        )

        self.assertEqual(
            reservation.remaining_reserved_quantity,
            Decimal("2.0000"),
        )
        self.assertEqual(
            reservation.unallocated_quantity,
            Decimal("1.0000"),
        )
        self.assertTrue(
            reservation.is_active,
        )
        self.assertFalse(
            reservation.is_terminal,
        )

    def test_create_location_stock_allocation(self):
        reservation = self._create_reservation(
            reserved_quantity="2.0000",
            status=(
                StockReservationStatus
                .PARTIALLY_ALLOCATED
            ),
        )

        allocation = (
            StockReservationAllocation.objects.create(
                company=self.company,
                reservation=reservation,
                sales_order_item=self.order_item,
                warehouse=self.warehouse,
                location=self.location,
                stock_item=self.stock_item,
                item=self.product,
                status=(
                    StockReservationAllocationStatus
                    .RESERVED
                ),
                reserved_quantity=Decimal("2.0000"),
                created_by=self.user,
                updated_by=self.user,
            )
        )

        self.assertEqual(
            allocation.reservation,
            reservation,
        )
        self.assertEqual(
            allocation.sales_order_item,
            self.order_item,
        )
        self.assertEqual(
            allocation.stock_item,
            self.stock_item,
        )
        self.assertEqual(
            allocation.warehouse,
            self.warehouse,
        )
        self.assertEqual(
            allocation.location,
            self.location,
        )
        self.assertEqual(
            allocation.remaining_reserved_quantity,
            Decimal("2.0000"),
        )
        self.assertIsNotNone(
            allocation.reserved_at,
        )

    def test_allocation_rejects_other_order_item(self):
        second_order = create_sales_order(
            company=self.company,
            user=self.user,
            branch_id=self.branch.id,
            items=[
                {
                    "catalog_item_id": self.product.id,
                    "quantity": "1.0000",
                }
            ],
        )

        reservation = self._create_reservation(
            reserved_quantity="1.0000",
            status=StockReservationStatus.ALLOCATED,
        )

        allocation = StockReservationAllocation(
            company=self.company,
            reservation=reservation,
            sales_order_item=second_order.items.get(),
            warehouse=self.warehouse,
            location=self.location,
            stock_item=self.stock_item,
            item=self.product,
            reserved_quantity=Decimal("1.0000"),
        )

        with self.assertRaises(ValidationError):
            allocation.full_clean()

    def test_allocation_rejects_stock_location_mismatch(self):
        second_location = create_inventory_location(
            company=self.company,
            warehouse=self.warehouse,
            data={
                "code": "RESERVATION-BIN-002",
                "name": "Reservation Bin 002",
                "location_type": InventoryLocationType.BIN,
                "is_pickable": True,
            },
            user=self.user,
        )

        reservation = self._create_reservation(
            reserved_quantity="1.0000",
            status=StockReservationStatus.ALLOCATED,
        )

        allocation = StockReservationAllocation(
            company=self.company,
            reservation=reservation,
            sales_order_item=self.order_item,
            warehouse=self.warehouse,
            location=second_location,
            stock_item=self.stock_item,
            item=self.product,
            reserved_quantity=Decimal("1.0000"),
        )

        with self.assertRaises(ValidationError):
            allocation.full_clean()

    def test_allocation_rejects_non_pickable_location(self):
        shipping_location = create_inventory_location(
            company=self.company,
            warehouse=self.warehouse,
            data={
                "code": "RESERVATION-SHIPPING",
                "name": "Reservation Shipping",
                "location_type": (
                    InventoryLocationType.SHIPPING
                ),
                "is_shipping": True,
                "is_pickable": False,
            },
            user=self.user,
        )

        shipping_stock = get_or_create_stock_item(
            company=self.company,
            warehouse=self.warehouse,
            location=shipping_location,
            item=self.product,
            user=self.user,
        )

        reservation = self._create_reservation(
            reserved_quantity="1.0000",
            status=StockReservationStatus.ALLOCATED,
        )

        allocation = StockReservationAllocation(
            company=self.company,
            reservation=reservation,
            sales_order_item=self.order_item,
            warehouse=self.warehouse,
            location=shipping_location,
            stock_item=shipping_stock,
            item=self.product,
            reserved_quantity=Decimal("1.0000"),
        )

        with self.assertRaises(ValidationError):
            allocation.full_clean()

    def test_allocation_rejects_consumed_above_reserved(self):
        reservation = self._create_reservation(
            reserved_quantity="2.0000",
            status=StockReservationStatus.ALLOCATED,
        )

        allocation = StockReservationAllocation(
            company=self.company,
            reservation=reservation,
            sales_order_item=self.order_item,
            warehouse=self.warehouse,
            location=self.location,
            stock_item=self.stock_item,
            item=self.product,
            reserved_quantity=Decimal("2.0000"),
            fulfilled_quantity=Decimal("1.5000"),
            released_quantity=Decimal("1.0000"),
        )

        with self.assertRaises(ValidationError):
            allocation.full_clean()

    def test_models_do_not_mutate_stock_balances(self):
        self.stock_item.quantity_on_hand = Decimal(
            "10.0000"
        )
        self.stock_item.reserved_quantity = Decimal(
            "0.0000"
        )
        self.stock_item.save(
            update_fields=[
                "quantity_on_hand",
                "reserved_quantity",
                "updated_at",
            ]
        )

        reservation = self._create_reservation(
            reserved_quantity="3.0000",
            status=(
                StockReservationStatus
                .PARTIALLY_ALLOCATED
            ),
        )

        StockReservationAllocation.objects.create(
            company=self.company,
            reservation=reservation,
            sales_order_item=self.order_item,
            warehouse=self.warehouse,
            location=self.location,
            stock_item=self.stock_item,
            item=self.product,
            status=(
                StockReservationAllocationStatus
                .RESERVED
            ),
            reserved_quantity=Decimal("3.0000"),
        )

        self.stock_item.refresh_from_db()

        self.assertEqual(
            self.stock_item.quantity_on_hand,
            Decimal("10.0000"),
        )
        self.assertEqual(
            self.stock_item.reserved_quantity,
            Decimal("0.0000"),
        )


# End Phase 22.3.1 Stock Reservation Models Foundation Tests
# ============================================================

# ============================================================
# Phase 22.3.2.1 Stock Reservation Service Foundation Tests
# ============================================================


class StockReservationServiceFoundationTests(
    InventoryTestBase
):
    """
    Service tests for reservation numbering, company queries,
    sales order validation, and payload builders.
    """

    def setUp(self):
        super().setUp()

        self.product.track_inventory = True
        self.product.save(
            update_fields=[
                "track_inventory",
                "updated_at",
            ]
        )

        self.location = create_inventory_location(
            company=self.company,
            warehouse=self.warehouse,
            data={
                "code": "SERVICE-RES-BIN",
                "name": "Service Reservation Bin",
                "location_type": InventoryLocationType.BIN,
                "is_default": True,
                "is_pickable": True,
            },
            user=self.user,
        )

        self.stock_item = get_or_create_stock_item(
            company=self.company,
            warehouse=self.warehouse,
            location=self.location,
            item=self.product,
            user=self.user,
        )

        self.order = create_sales_order(
            company=self.company,
            user=self.user,
            branch_id=self.branch.id,
            items=[
                {
                    "catalog_item_id": self.product.id,
                    "quantity": "4.0000",
                }
            ],
        )

        self.order_item = self.order.items.get()

    def _confirm_order(self):
        self.order.status = "CONFIRMED"
        self.order.save(
            update_fields=[
                "status",
                "updated_at",
            ]
        )
        self.order.refresh_from_db()

    def _create_reservation(
        self,
        *,
        number="RSV-SERVICE-001",
        requested="4.0000",
        reserved="0.0000",
        status=StockReservationStatus.DRAFT,
    ):
        return StockReservation.objects.create(
            company=self.company,
            sales_order=self.order,
            reservation_number=number,
            source=StockReservationSource.SALES_ORDER,
            status=status,
            requested_quantity=Decimal(requested),
            reserved_quantity=Decimal(reserved),
            created_by=self.user,
            updated_by=self.user,
        )

    def test_generate_stock_reservation_number(self):
        self.assertEqual(
            generate_stock_reservation_number(
                self.company
            ),
            "RSV-000001",
        )

        self._create_reservation()

        self.assertEqual(
            generate_stock_reservation_number(
                self.company
            ),
            "RSV-000002",
        )

    def test_reservation_queries_are_company_scoped(self):
        reservation = self._create_reservation()

        own_ids = set(
            get_company_stock_reservations(
                self.company
            ).values_list(
                "id",
                flat=True,
            )
        )

        other_ids = set(
            get_company_stock_reservations(
                self.other_company
            ).values_list(
                "id",
                flat=True,
            )
        )

        self.assertIn(
            reservation.id,
            own_ids,
        )
        self.assertNotIn(
            reservation.id,
            other_ids,
        )

    def test_draft_sales_order_is_not_reservable(self):
        with self.assertRaises(ValidationError):
            validate_sales_order_for_stock_reservation(
                company=self.company,
                sales_order=self.order,
            )

    def test_confirmed_sales_order_is_reservable(self):
        self._confirm_order()

        validate_sales_order_for_stock_reservation(
            company=self.company,
            sales_order=self.order,
        )

    def test_sales_order_validation_rejects_other_company(self):
        with self.assertRaises(ValidationError):
            validate_sales_order_for_stock_reservation(
                company=self.other_company,
                sales_order=self.order,
                require_reservable_status=False,
            )

    def test_sales_order_item_validation_accepts_stock_item(
        self,
    ):
        self._confirm_order()

        validate_sales_order_item_for_stock_reservation(
            company=self.company,
            sales_order=self.order,
            sales_order_item=self.order_item,
        )

    def test_reservation_payload_without_allocations(self):
        reservation = self._create_reservation()

        payload = build_stock_reservation_payload(
            reservation,
        )

        self.assertEqual(
            payload["id"],
            reservation.id,
        )
        self.assertEqual(
            payload["company_id"],
            self.company.id,
        )
        self.assertEqual(
            payload["sales_order_id"],
            self.order.id,
        )
        self.assertEqual(
            payload["reservation_number"],
            "RSV-SERVICE-001",
        )
        self.assertEqual(
            payload["requested_quantity"],
            "4.0000",
        )
        self.assertNotIn(
            "allocations",
            payload,
        )

    def test_allocation_query_and_payload(self):
        reservation = self._create_reservation(
            reserved="2.0000",
            status=(
                StockReservationStatus
                .PARTIALLY_ALLOCATED
            ),
        )

        allocation = (
            StockReservationAllocation.objects.create(
                company=self.company,
                reservation=reservation,
                sales_order_item=self.order_item,
                warehouse=self.warehouse,
                location=self.location,
                stock_item=self.stock_item,
                item=self.product,
                status=(
                    StockReservationAllocationStatus
                    .RESERVED
                ),
                reserved_quantity=Decimal("2.0000"),
                created_by=self.user,
                updated_by=self.user,
            )
        )

        allocation_ids = set(
            get_company_stock_reservation_allocations(
                self.company
            ).values_list(
                "id",
                flat=True,
            )
        )

        self.assertIn(
            allocation.id,
            allocation_ids,
        )

        allocation_payload = (
            build_stock_reservation_allocation_payload(
                allocation
            )
        )

        self.assertEqual(
            allocation_payload["id"],
            allocation.id,
        )
        self.assertEqual(
            allocation_payload["location_id"],
            self.location.id,
        )
        self.assertEqual(
            allocation_payload["reserved_quantity"],
            "2.0000",
        )

        reservation_payload = (
            build_stock_reservation_payload(
                reservation,
                include_allocations=True,
            )
        )

        self.assertEqual(
            len(reservation_payload["allocations"]),
            1,
        )
        self.assertEqual(
            reservation_payload[
                "allocations"
            ][0]["id"],
            allocation.id,
        )


# End Phase 22.3.2.1 Stock Reservation Service Foundation Tests
# ============================================================

# ============================================================
# Phase 22.3.2.2 Atomic Stock Reservation Allocation Tests
# ============================================================


class AtomicStockReservationAllocationTests(
    InventoryTestBase
):
    """
    Verify atomic reservation creation and location-level stock
    allocation without creating StockMovement rows.
    """

    def setUp(self):
        super().setUp()

        self.product.track_inventory = True
        self.product.save(
            update_fields=[
                "track_inventory",
                "updated_at",
            ]
        )

        self.location = create_inventory_location(
            company=self.company,
            warehouse=self.warehouse,
            data={
                "code": "ATOMIC-RES-BIN",
                "name": "Atomic Reservation Bin",
                "location_type": InventoryLocationType.BIN,
                "is_default": True,
                "is_pickable": True,
            },
            user=self.user,
        )

        self.stock_item = get_or_create_stock_item(
            company=self.company,
            warehouse=self.warehouse,
            location=self.location,
            item=self.product,
            user=self.user,
        )

        self.stock_item.quantity_on_hand = Decimal(
            "10.0000"
        )
        self.stock_item.reserved_quantity = Decimal(
            "0.0000"
        )
        self.stock_item.save(
            update_fields=[
                "quantity_on_hand",
                "reserved_quantity",
                "updated_at",
            ]
        )

        self.order = create_sales_order(
            company=self.company,
            user=self.user,
            branch_id=self.branch.id,
            items=[
                {
                    "catalog_item_id": self.product.id,
                    "quantity": "4.0000",
                }
            ],
        )

        self.order.status = "CONFIRMED"
        self.order.save(
            update_fields=[
                "status",
                "updated_at",
            ]
        )
        self.order.refresh_from_db()

        self.order_item = self.order.items.get()

    def _create_reservation(self):
        return create_sales_order_stock_reservation(
            company=self.company,
            sales_order=self.order,
            notes="Atomic reservation test",
            user=self.user,
        )

    def test_create_reservation_header_from_sales_order(self):
        movement_count = StockMovement.objects.count()

        reservation = self._create_reservation()

        self.assertEqual(
            reservation.company,
            self.company,
        )
        self.assertEqual(
            reservation.sales_order,
            self.order,
        )
        self.assertEqual(
            reservation.status,
            StockReservationStatus.DRAFT,
        )
        self.assertEqual(
            reservation.requested_quantity,
            Decimal("4.0000"),
        )
        self.assertEqual(
            reservation.reserved_quantity,
            Decimal("0.0000"),
        )

        self.stock_item.refresh_from_db()

        self.assertEqual(
            self.stock_item.reserved_quantity,
            Decimal("0.0000"),
        )
        self.assertEqual(
            StockMovement.objects.count(),
            movement_count,
        )

    def test_duplicate_active_reservation_is_rejected(self):
        self._create_reservation()

        with self.assertRaises(ValidationError):
            self._create_reservation()

        self.assertEqual(
            StockReservation.objects.filter(
                company=self.company,
                sales_order=self.order,
            ).count(),
            1,
        )

    def test_partial_allocation_updates_reserved_quantity(self):
        reservation = self._create_reservation()
        movement_count = StockMovement.objects.count()

        allocation = allocate_stock_reservation(
            company=self.company,
            reservation=reservation,
            sales_order_item=self.order_item,
            stock_item=self.stock_item,
            quantity="2.0000",
            user=self.user,
        )

        self.stock_item.refresh_from_db()
        reservation.refresh_from_db()

        self.assertEqual(
            allocation.status,
            StockReservationAllocationStatus.RESERVED,
        )
        self.assertEqual(
            allocation.reserved_quantity,
            Decimal("2.0000"),
        )
        self.assertEqual(
            self.stock_item.quantity_on_hand,
            Decimal("10.0000"),
        )
        self.assertEqual(
            self.stock_item.reserved_quantity,
            Decimal("2.0000"),
        )
        self.assertEqual(
            self.stock_item.available_quantity,
            Decimal("8.0000"),
        )
        self.assertEqual(
            reservation.reserved_quantity,
            Decimal("2.0000"),
        )
        self.assertEqual(
            reservation.status,
            StockReservationStatus.PARTIALLY_ALLOCATED,
        )
        self.assertIsNotNone(
            reservation.allocated_at,
        )
        self.assertEqual(
            StockMovement.objects.count(),
            movement_count,
        )

    def test_full_allocation_marks_reservation_allocated(self):
        reservation = self._create_reservation()

        allocation = allocate_stock_reservation(
            company=self.company,
            reservation=reservation,
            sales_order_item=self.order_item,
            stock_item=self.stock_item,
            quantity="4.0000",
            user=self.user,
        )

        self.stock_item.refresh_from_db()
        reservation.refresh_from_db()

        self.assertEqual(
            allocation.reserved_quantity,
            Decimal("4.0000"),
        )
        self.assertEqual(
            self.stock_item.reserved_quantity,
            Decimal("4.0000"),
        )
        self.assertEqual(
            reservation.reserved_quantity,
            Decimal("4.0000"),
        )
        self.assertEqual(
            reservation.status,
            StockReservationStatus.ALLOCATED,
        )
        self.assertEqual(
            reservation.unallocated_quantity,
            Decimal("0.0000"),
        )
        self.assertEqual(
            reservation.allocated_by,
            self.user,
        )

    def test_insufficient_available_stock_rolls_back(self):
        self.stock_item.quantity_on_hand = Decimal(
            "2.0000"
        )
        self.stock_item.save(
            update_fields=[
                "quantity_on_hand",
                "updated_at",
            ]
        )

        reservation = self._create_reservation()

        with self.assertRaises(ValidationError):
            allocate_stock_reservation(
                company=self.company,
                reservation=reservation,
                sales_order_item=self.order_item,
                stock_item=self.stock_item,
                quantity="3.0000",
                user=self.user,
            )

        self.stock_item.refresh_from_db()
        reservation.refresh_from_db()

        self.assertEqual(
            self.stock_item.reserved_quantity,
            Decimal("0.0000"),
        )
        self.assertEqual(
            reservation.reserved_quantity,
            Decimal("0.0000"),
        )
        self.assertEqual(
            reservation.status,
            StockReservationStatus.DRAFT,
        )
        self.assertFalse(
            StockReservationAllocation.objects.filter(
                reservation=reservation,
            ).exists()
        )

    def test_allocation_cannot_exceed_order_line_quantity(self):
        reservation = self._create_reservation()

        allocate_stock_reservation(
            company=self.company,
            reservation=reservation,
            sales_order_item=self.order_item,
            stock_item=self.stock_item,
            quantity="3.0000",
            user=self.user,
        )

        with self.assertRaises(ValidationError):
            allocate_stock_reservation(
                company=self.company,
                reservation=reservation,
                sales_order_item=self.order_item,
                stock_item=self.stock_item,
                quantity="2.0000",
                user=self.user,
            )

        self.stock_item.refresh_from_db()
        reservation.refresh_from_db()

        self.assertEqual(
            self.stock_item.reserved_quantity,
            Decimal("3.0000"),
        )
        self.assertEqual(
            reservation.reserved_quantity,
            Decimal("3.0000"),
        )
        self.assertEqual(
            reservation.allocations.count(),
            1,
        )

    def test_allocation_rejects_stock_item_for_other_item(self):
        other_item = CatalogItem.objects.get(
            id=self.product.id,
        )
        other_item.pk = None
        other_item.id = None
        other_item.company = self.company
        other_item.code = "ATOMIC-OTHER-PRODUCT"
        other_item.sku = "ATOMIC-OTHER-SKU"
        other_item.barcode = ""
        other_item.name = "Atomic Other Product"
        other_item.name_ar = "??? ??? ???"
        other_item.name_en = "Atomic Other Product"
        other_item.track_inventory = True
        other_item.save()

        other_stock_item = get_or_create_stock_item(
            company=self.company,
            warehouse=self.warehouse,
            location=self.location,
            item=other_item,
            user=self.user,
        )
        other_stock_item.quantity_on_hand = Decimal(
            "10.0000"
        )
        other_stock_item.save(
            update_fields=[
                "quantity_on_hand",
                "updated_at",
            ]
        )

        reservation = self._create_reservation()

        with self.assertRaises(ValidationError):
            allocate_stock_reservation(
                company=self.company,
                reservation=reservation,
                sales_order_item=self.order_item,
                stock_item=other_stock_item,
                quantity="1.0000",
                user=self.user,
            )

        other_stock_item.refresh_from_db()
        reservation.refresh_from_db()

        self.assertEqual(
            other_stock_item.reserved_quantity,
            Decimal("0.0000"),
        )
        self.assertEqual(
            reservation.reserved_quantity,
            Decimal("0.0000"),
        )

    def test_allocated_reservation_rejects_more_allocations(self):
        reservation = self._create_reservation()

        allocate_stock_reservation(
            company=self.company,
            reservation=reservation,
            sales_order_item=self.order_item,
            stock_item=self.stock_item,
            quantity="4.0000",
            user=self.user,
        )

        reservation.refresh_from_db()

        with self.assertRaises(ValidationError):
            allocate_stock_reservation(
                company=self.company,
                reservation=reservation,
                sales_order_item=self.order_item,
                stock_item=self.stock_item,
                quantity="1.0000",
                user=self.user,
            )

        self.stock_item.refresh_from_db()

        self.assertEqual(
            self.stock_item.reserved_quantity,
            Decimal("4.0000"),
        )
        self.assertEqual(
            reservation.allocations.count(),
            1,
        )


# End Phase 22.3.2.2 Atomic Stock Reservation Allocation Tests
# ============================================================

# ============================================================
# Phase 22.3.2.3 Reservation Release Lifecycle Tests
# ============================================================


class StockReservationReleaseLifecycleTests(
    InventoryTestBase
):
    """
    Verify reservation release, cancellation, and expiry.

    These operations must return reserved stock availability
    without changing quantity_on_hand or creating StockMovement.
    """

    def setUp(self):
        super().setUp()

        self.location = create_inventory_location(
            company=self.company,
            warehouse=self.warehouse,
            data={
                "code": "RELEASE-RES-BIN",
                "name": "Release Reservation Bin",
                "location_type": InventoryLocationType.BIN,
                "is_default": True,
                "is_pickable": True,
            },
            user=self.user,
        )

        self.stock_item = get_or_create_stock_item(
            company=self.company,
            warehouse=self.warehouse,
            location=self.location,
            item=self.product,
            user=self.user,
        )

        self.stock_item.quantity_on_hand = Decimal(
            "10.0000"
        )
        self.stock_item.reserved_quantity = Decimal(
            "0.0000"
        )
        self.stock_item.save(
            update_fields=[
                "quantity_on_hand",
                "reserved_quantity",
                "updated_at",
            ]
        )

        self.order = create_sales_order(
            company=self.company,
            user=self.user,
            branch_id=self.branch.id,
            items=[
                {
                    "catalog_item_id": self.product.id,
                    "quantity": "4.0000",
                }
            ],
        )

        self.order.status = "CONFIRMED"
        self.order.save(
            update_fields=[
                "status",
                "updated_at",
            ]
        )
        self.order.refresh_from_db()

        self.order_item = self.order.items.get()

    def _create_reservation(
        self,
        *,
        expires_at=None,
    ):
        return create_sales_order_stock_reservation(
            company=self.company,
            sales_order=self.order,
            expires_at=expires_at,
            notes="Release lifecycle test",
            user=self.user,
        )

    def _allocate(
        self,
        *,
        quantity="4.0000",
        expires_at=None,
    ):
        reservation = self._create_reservation(
            expires_at=expires_at,
        )

        allocation = allocate_stock_reservation(
            company=self.company,
            reservation=reservation,
            sales_order_item=self.order_item,
            stock_item=self.stock_item,
            quantity=quantity,
            user=self.user,
        )

        return reservation, allocation

    def test_partial_allocation_release_returns_stock_availability(
        self,
    ):
        reservation, allocation = self._allocate()
        movement_count = StockMovement.objects.count()

        released = release_stock_reservation_allocation(
            company=self.company,
            allocation=allocation,
            quantity="1.5000",
            reason="Partial customer adjustment",
            user=self.user,
        )

        self.stock_item.refresh_from_db()
        reservation.refresh_from_db()

        self.assertEqual(
            released.released_quantity,
            Decimal("1.5000"),
        )
        self.assertEqual(
            released.remaining_reserved_quantity,
            Decimal("2.5000"),
        )
        self.assertEqual(
            released.status,
            StockReservationAllocationStatus.RESERVED,
        )
        self.assertEqual(
            self.stock_item.quantity_on_hand,
            Decimal("10.0000"),
        )
        self.assertEqual(
            self.stock_item.reserved_quantity,
            Decimal("2.5000"),
        )
        self.assertEqual(
            self.stock_item.available_quantity,
            Decimal("7.5000"),
        )
        self.assertEqual(
            reservation.released_quantity,
            Decimal("1.5000"),
        )
        self.assertEqual(
            reservation.remaining_reserved_quantity,
            Decimal("2.5000"),
        )
        self.assertEqual(
            StockMovement.objects.count(),
            movement_count,
        )

    def test_full_allocation_release_marks_records_released(
        self,
    ):
        reservation, allocation = self._allocate()

        released = release_stock_reservation_allocation(
            company=self.company,
            allocation=allocation,
            reason="Full release",
            user=self.user,
        )

        self.stock_item.refresh_from_db()
        reservation.refresh_from_db()

        self.assertEqual(
            released.status,
            StockReservationAllocationStatus.RELEASED,
        )
        self.assertEqual(
            released.released_quantity,
            Decimal("4.0000"),
        )
        self.assertEqual(
            released.remaining_reserved_quantity,
            Decimal("0.0000"),
        )
        self.assertEqual(
            reservation.status,
            StockReservationStatus.RELEASED,
        )
        self.assertEqual(
            reservation.released_quantity,
            Decimal("4.0000"),
        )
        self.assertEqual(
            reservation.remaining_reserved_quantity,
            Decimal("0.0000"),
        )
        self.assertEqual(
            self.stock_item.reserved_quantity,
            Decimal("0.0000"),
        )
        self.assertEqual(
            self.stock_item.quantity_on_hand,
            Decimal("10.0000"),
        )
        self.assertIsNotNone(
            reservation.released_at,
        )

    def test_release_rejects_quantity_above_remaining(
        self,
    ):
        reservation, allocation = self._allocate(
            quantity="2.0000",
        )

        with self.assertRaises(ValidationError):
            release_stock_reservation_allocation(
                company=self.company,
                allocation=allocation,
                quantity="3.0000",
                user=self.user,
            )

        self.stock_item.refresh_from_db()
        reservation.refresh_from_db()
        allocation.refresh_from_db()

        self.assertEqual(
            self.stock_item.reserved_quantity,
            Decimal("2.0000"),
        )
        self.assertEqual(
            reservation.released_quantity,
            Decimal("0.0000"),
        )
        self.assertEqual(
            allocation.released_quantity,
            Decimal("0.0000"),
        )

    def test_fully_released_allocation_cannot_release_again(
        self,
    ):
        _reservation, allocation = self._allocate(
            quantity="2.0000",
        )

        release_stock_reservation_allocation(
            company=self.company,
            allocation=allocation,
            user=self.user,
        )

        with self.assertRaises(ValidationError):
            release_stock_reservation_allocation(
                company=self.company,
                allocation=allocation,
                quantity="1.0000",
                user=self.user,
            )

        self.stock_item.refresh_from_db()

        self.assertEqual(
            self.stock_item.reserved_quantity,
            Decimal("0.0000"),
        )

    def test_cancel_reservation_releases_all_stock(
        self,
    ):
        reservation, allocation = self._allocate()
        movement_count = StockMovement.objects.count()

        cancelled = cancel_stock_reservation(
            company=self.company,
            reservation=reservation,
            reason="Sales order cancelled",
            user=self.user,
        )

        self.stock_item.refresh_from_db()
        allocation.refresh_from_db()

        self.assertEqual(
            cancelled.status,
            StockReservationStatus.CANCELLED,
        )
        self.assertEqual(
            cancelled.released_quantity,
            Decimal("4.0000"),
        )
        self.assertEqual(
            allocation.status,
            StockReservationAllocationStatus.CANCELLED,
        )
        self.assertEqual(
            allocation.released_quantity,
            Decimal("4.0000"),
        )
        self.assertEqual(
            self.stock_item.reserved_quantity,
            Decimal("0.0000"),
        )
        self.assertEqual(
            self.stock_item.quantity_on_hand,
            Decimal("10.0000"),
        )
        self.assertIsNotNone(
            cancelled.cancelled_at,
        )
        self.assertEqual(
            cancelled.cancelled_by,
            self.user,
        )
        self.assertEqual(
            StockMovement.objects.count(),
            movement_count,
        )

    def test_cancelled_reservation_cannot_be_cancelled_again(
        self,
    ):
        reservation, _allocation = self._allocate()

        cancel_stock_reservation(
            company=self.company,
            reservation=reservation,
            reason="First cancellation",
            user=self.user,
        )

        with self.assertRaises(ValidationError):
            cancel_stock_reservation(
                company=self.company,
                reservation=reservation,
                reason="Second cancellation",
                user=self.user,
            )

        self.stock_item.refresh_from_db()

        self.assertEqual(
            self.stock_item.reserved_quantity,
            Decimal("0.0000"),
        )

    def test_expire_reservation_releases_all_stock(
        self,
    ):
        reservation, allocation = self._allocate(
            expires_at=(
                timezone.now()
                + timedelta(hours=1)
            ),
        )

        simulated_created_at = (
            timezone.now()
            - timedelta(hours=2)
        )
        simulated_expires_at = (
            timezone.now()
            - timedelta(minutes=5)
        )

        StockReservation.objects.filter(
            id=reservation.id,
            company=self.company,
        ).update(
            created_at=simulated_created_at,
            expires_at=simulated_expires_at,
        )
        reservation.refresh_from_db()

        movement_count = StockMovement.objects.count()

        expired = expire_stock_reservation(
            company=self.company,
            reservation=reservation,
            reason="Reservation timeout",
            user=self.user,
        )

        self.stock_item.refresh_from_db()
        allocation.refresh_from_db()

        self.assertEqual(
            expired.status,
            StockReservationStatus.EXPIRED,
        )
        self.assertEqual(
            expired.released_quantity,
            Decimal("4.0000"),
        )
        self.assertEqual(
            allocation.status,
            StockReservationAllocationStatus.RELEASED,
        )
        self.assertEqual(
            allocation.released_quantity,
            Decimal("4.0000"),
        )
        self.assertEqual(
            self.stock_item.reserved_quantity,
            Decimal("0.0000"),
        )
        self.assertEqual(
            self.stock_item.quantity_on_hand,
            Decimal("10.0000"),
        )
        self.assertIsNotNone(
            expired.expired_at,
        )
        self.assertEqual(
            StockMovement.objects.count(),
            movement_count,
        )

    def test_future_reservation_cannot_expire_early(
        self,
    ):
        reservation, allocation = self._allocate(
            expires_at=(
                timezone.now()
                + timedelta(hours=2)
            ),
        )

        with self.assertRaises(ValidationError):
            expire_stock_reservation(
                company=self.company,
                reservation=reservation,
                user=self.user,
            )

        self.stock_item.refresh_from_db()
        reservation.refresh_from_db()
        allocation.refresh_from_db()

        self.assertEqual(
            reservation.status,
            StockReservationStatus.ALLOCATED,
        )
        self.assertEqual(
            allocation.status,
            StockReservationAllocationStatus.RESERVED,
        )
        self.assertEqual(
            reservation.released_quantity,
            Decimal("0.0000"),
        )
        self.assertEqual(
            allocation.released_quantity,
            Decimal("0.0000"),
        )
        self.assertEqual(
            self.stock_item.reserved_quantity,
            Decimal("4.0000"),
        )
        self.assertEqual(
            self.stock_item.quantity_on_hand,
            Decimal("10.0000"),
        )


# End Phase 22.3.2.3 Reservation Release Lifecycle Tests
# ============================================================

# ============================================================
# Phase 22.3.3 - Batch Serial Allocation and Release Tests
# ============================================================


class TrackedStockReservationLifecycleTests(
    InventoryTestBase
):
    """
    Verify batch and serial reservation allocation, release,
    cancellation, expiry, tenant isolation, and ledger safety.
    """

    def setUp(self):
        super().setUp()

        self.location = create_inventory_location(
            company=self.company,
            warehouse=self.warehouse,
            data={
                "code": "TRACKED-RESERVATION-BIN",
                "name": "Tracked Reservation Bin",
                "location_type": InventoryLocationType.BIN,
                "is_default": True,
                "is_pickable": True,
            },
            user=self.user,
        )

        self.batch_product = CatalogItem.objects.create(
            company=self.company,
            unit=self.unit,
            item_type=CatalogItemType.PRODUCT,
            code="RES-BATCH-ITEM",
            sku="RES-BATCH-SKU",
            barcode="RES-BATCH-BAR",
            name="Reservation Batch Product",
            purchase_price=Decimal("15.00"),
            cost_price=Decimal("15.00"),
            sale_price=Decimal("25.00"),
            track_inventory=True,
            inventory_tracking_method=(
                CatalogItemTrackingMethod.BATCH
            ),
            track_expiry_dates=True,
            is_purchasable=True,
            is_sellable=True,
        )

        self.serial_product = CatalogItem.objects.create(
            company=self.company,
            unit=self.unit,
            item_type=CatalogItemType.PRODUCT,
            code="RES-SERIAL-ITEM",
            sku="RES-SERIAL-SKU",
            barcode="RES-SERIAL-BAR",
            name="Reservation Serial Product",
            purchase_price=Decimal("50.00"),
            cost_price=Decimal("50.00"),
            sale_price=Decimal("75.00"),
            track_inventory=True,
            inventory_tracking_method=(
                CatalogItemTrackingMethod.SERIAL
            ),
            track_expiry_dates=False,
            is_purchasable=True,
            is_sellable=True,
        )

        self.batch_stock_item = get_or_create_stock_item(
            company=self.company,
            warehouse=self.warehouse,
            location=self.location,
            item=self.batch_product,
            user=self.user,
        )
        self.batch_stock_item.quantity_on_hand = Decimal(
            "10.0000"
        )
        self.batch_stock_item.save(
            update_fields=[
                "quantity_on_hand",
                "updated_at",
            ]
        )

        self.batch = create_inventory_batch(
            company=self.company,
            item=self.batch_product,
            batch_number="RES-BATCH-001",
            manufactured_at=timezone.localdate(),
            expiry_date=(
                timezone.localdate()
                + timedelta(days=365)
            ),
            user=self.user,
        )

        self.batch_balance = (
            InventoryBatchBalance.objects.create(
                company=self.company,
                warehouse=self.warehouse,
                location=self.location,
                stock_item=self.batch_stock_item,
                item=self.batch_product,
                batch=self.batch,
                quantity_on_hand=Decimal("10.0000"),
                reserved_quantity=Decimal("0.0000"),
                average_cost=Decimal("15.00"),
            )
        )

        self.serial_stock_item = get_or_create_stock_item(
            company=self.company,
            warehouse=self.warehouse,
            location=self.location,
            item=self.serial_product,
            user=self.user,
        )
        self.serial_stock_item.quantity_on_hand = Decimal(
            "2.0000"
        )
        self.serial_stock_item.save(
            update_fields=[
                "quantity_on_hand",
                "updated_at",
            ]
        )

        self.serial_one = register_inventory_serial_number(
            company=self.company,
            item=self.serial_product,
            warehouse=self.warehouse,
            location=self.location,
            stock_item=self.serial_stock_item,
            serial_number="RES-SERIAL-001",
            unit_cost="50.00",
            user=self.user,
        )
        self.serial_two = register_inventory_serial_number(
            company=self.company,
            item=self.serial_product,
            warehouse=self.warehouse,
            location=self.location,
            stock_item=self.serial_stock_item,
            serial_number="RES-SERIAL-002",
            unit_cost="50.00",
            user=self.user,
        )

    def _create_order_reservation(
        self,
        *,
        item,
        quantity,
        expires_at=None,
    ):
        order = create_sales_order(
            company=self.company,
            user=self.user,
            branch_id=self.branch.id,
            items=[
                {
                    "catalog_item_id": item.id,
                    "quantity": str(quantity),
                }
            ],
        )
        order.status = "CONFIRMED"
        order.save(
            update_fields=[
                "status",
                "updated_at",
            ]
        )
        order.refresh_from_db()

        reservation = create_sales_order_stock_reservation(
            company=self.company,
            sales_order=order,
            expires_at=expires_at,
            user=self.user,
        )

        return order, order.items.get(), reservation

    def _allocate_batch(
        self,
        *,
        quantity="4.0000",
        expires_at=None,
    ):
        _order, order_item, reservation = (
            self._create_order_reservation(
                item=self.batch_product,
                quantity=quantity,
                expires_at=expires_at,
            )
        )

        allocation = allocate_batch_stock_reservation(
            company=self.company,
            reservation=reservation,
            sales_order_item=order_item,
            batch_balance=self.batch_balance,
            quantity=quantity,
            user=self.user,
        )

        return reservation, allocation

    def _allocate_serial(
        self,
        *,
        serial=None,
        expires_at=None,
    ):
        serial = serial or self.serial_one

        _order, order_item, reservation = (
            self._create_order_reservation(
                item=self.serial_product,
                quantity="1.0000",
                expires_at=expires_at,
            )
        )

        allocation = allocate_serial_stock_reservation(
            company=self.company,
            reservation=reservation,
            sales_order_item=order_item,
            serial_number=serial,
            user=self.user,
        )

        return reservation, allocation

    def test_batch_allocation_updates_both_reserved_balances(self):
        movement_count = StockMovement.objects.count()

        reservation, allocation = self._allocate_batch()

        self.batch_stock_item.refresh_from_db()
        self.batch_balance.refresh_from_db()
        reservation.refresh_from_db()

        self.assertEqual(
            allocation.batch,
            self.batch,
        )
        self.assertIsNone(allocation.serial_number)
        self.assertEqual(
            self.batch_stock_item.reserved_quantity,
            Decimal("4.0000"),
        )
        self.assertEqual(
            self.batch_balance.reserved_quantity,
            Decimal("4.0000"),
        )
        self.assertEqual(
            self.batch_stock_item.quantity_on_hand,
            Decimal("10.0000"),
        )
        self.assertEqual(
            self.batch_balance.quantity_on_hand,
            Decimal("10.0000"),
        )
        self.assertEqual(
            reservation.status,
            StockReservationStatus.ALLOCATED,
        )
        self.assertEqual(
            StockMovement.objects.count(),
            movement_count,
        )

    def test_expired_batch_allocation_is_rejected_atomically(self):
        expired_batch = InventoryBatch.objects.create(
            company=self.company,
            item=self.batch_product,
            batch_number="RES-BATCH-EXPIRED",
            manufactured_at=(
                timezone.localdate()
                - timedelta(days=30)
            ),
            expiry_date=(
                timezone.localdate()
                - timedelta(days=1)
            ),
        )

        expired_balance = InventoryBatchBalance.objects.create(
            company=self.company,
            warehouse=self.warehouse,
            location=self.location,
            stock_item=self.batch_stock_item,
            item=self.batch_product,
            batch=expired_batch,
            quantity_on_hand=Decimal("5.0000"),
            reserved_quantity=Decimal("0.0000"),
        )

        _order, order_item, reservation = (
            self._create_order_reservation(
                item=self.batch_product,
                quantity="2.0000",
            )
        )

        with self.assertRaises(ValidationError):
            allocate_batch_stock_reservation(
                company=self.company,
                reservation=reservation,
                sales_order_item=order_item,
                batch_balance=expired_balance,
                quantity="2.0000",
                user=self.user,
            )

        self.batch_stock_item.refresh_from_db()
        expired_balance.refresh_from_db()
        reservation.refresh_from_db()

        self.assertEqual(
            self.batch_stock_item.reserved_quantity,
            Decimal("0.0000"),
        )
        self.assertEqual(
            expired_balance.reserved_quantity,
            Decimal("0.0000"),
        )
        self.assertEqual(
            reservation.reserved_quantity,
            Decimal("0.0000"),
        )

    def test_batch_partial_release_updates_both_balances(self):
        reservation, allocation = self._allocate_batch()

        released = release_stock_reservation_allocation(
            company=self.company,
            allocation=allocation,
            quantity="1.5000",
            reason="Partial tracked release",
            user=self.user,
        )

        self.batch_stock_item.refresh_from_db()
        self.batch_balance.refresh_from_db()
        reservation.refresh_from_db()

        self.assertEqual(
            released.released_quantity,
            Decimal("1.5000"),
        )
        self.assertEqual(
            self.batch_stock_item.reserved_quantity,
            Decimal("2.5000"),
        )
        self.assertEqual(
            self.batch_balance.reserved_quantity,
            Decimal("2.5000"),
        )
        self.assertEqual(
            self.batch_stock_item.quantity_on_hand,
            Decimal("10.0000"),
        )

    def test_batch_cancellation_releases_all_balances(self):
        reservation, allocation = self._allocate_batch()
        movement_count = StockMovement.objects.count()

        cancelled = cancel_stock_reservation(
            company=self.company,
            reservation=reservation,
            reason="Cancel tracked batch reservation",
            user=self.user,
        )

        self.batch_stock_item.refresh_from_db()
        self.batch_balance.refresh_from_db()
        allocation.refresh_from_db()

        self.assertEqual(
            cancelled.status,
            StockReservationStatus.CANCELLED,
        )
        self.assertEqual(
            allocation.status,
            StockReservationAllocationStatus.CANCELLED,
        )
        self.assertEqual(
            self.batch_stock_item.reserved_quantity,
            Decimal("0.0000"),
        )
        self.assertEqual(
            self.batch_balance.reserved_quantity,
            Decimal("0.0000"),
        )
        self.assertEqual(
            StockMovement.objects.count(),
            movement_count,
        )

    def test_serial_allocation_reserves_serial_and_stock(self):
        movement_count = StockMovement.objects.count()

        reservation, allocation = self._allocate_serial()

        self.serial_one.refresh_from_db()
        self.serial_stock_item.refresh_from_db()
        reservation.refresh_from_db()

        self.assertEqual(
            allocation.serial_number,
            self.serial_one,
        )
        self.assertIsNone(allocation.batch)
        self.assertEqual(
            allocation.reserved_quantity,
            Decimal("1.0000"),
        )
        self.assertEqual(
            self.serial_one.status,
            InventorySerialStatus.RESERVED,
        )
        self.assertEqual(
            self.serial_stock_item.reserved_quantity,
            Decimal("1.0000"),
        )
        self.assertEqual(
            self.serial_stock_item.quantity_on_hand,
            Decimal("2.0000"),
        )
        self.assertEqual(
            reservation.status,
            StockReservationStatus.ALLOCATED,
        )
        self.assertEqual(
            StockMovement.objects.count(),
            movement_count,
        )

    def test_reserved_serial_cannot_be_allocated_again(self):
        self._allocate_serial(
            serial=self.serial_one,
        )

        _order, order_item, reservation = (
            self._create_order_reservation(
                item=self.serial_product,
                quantity="1.0000",
            )
        )

        with self.assertRaises(ValidationError):
            allocate_serial_stock_reservation(
                company=self.company,
                reservation=reservation,
                sales_order_item=order_item,
                serial_number=self.serial_one,
                user=self.user,
            )

        self.serial_one.refresh_from_db()
        self.serial_stock_item.refresh_from_db()
        reservation.refresh_from_db()

        self.assertEqual(
            self.serial_one.status,
            InventorySerialStatus.RESERVED,
        )
        self.assertEqual(
            self.serial_stock_item.reserved_quantity,
            Decimal("1.0000"),
        )
        self.assertEqual(
            reservation.reserved_quantity,
            Decimal("0.0000"),
        )

    def test_serial_release_returns_serial_to_available(self):
        reservation, allocation = self._allocate_serial()

        released = release_stock_reservation_allocation(
            company=self.company,
            allocation=allocation,
            reason="Release serial reservation",
            user=self.user,
        )

        self.serial_one.refresh_from_db()
        self.serial_stock_item.refresh_from_db()
        reservation.refresh_from_db()

        self.assertEqual(
            released.status,
            StockReservationAllocationStatus.RELEASED,
        )
        self.assertEqual(
            self.serial_one.status,
            InventorySerialStatus.AVAILABLE,
        )
        self.assertEqual(
            self.serial_stock_item.reserved_quantity,
            Decimal("0.0000"),
        )
        self.assertEqual(
            reservation.status,
            StockReservationStatus.RELEASED,
        )

    def test_serial_partial_release_is_rejected_atomically(self):
        reservation, allocation = self._allocate_serial()

        with self.assertRaises(ValidationError):
            release_stock_reservation_allocation(
                company=self.company,
                allocation=allocation,
                quantity="0.5000",
                user=self.user,
            )

        self.serial_one.refresh_from_db()
        self.serial_stock_item.refresh_from_db()
        allocation.refresh_from_db()
        reservation.refresh_from_db()

        self.assertEqual(
            self.serial_one.status,
            InventorySerialStatus.RESERVED,
        )
        self.assertEqual(
            self.serial_stock_item.reserved_quantity,
            Decimal("1.0000"),
        )
        self.assertEqual(
            allocation.released_quantity,
            Decimal("0.0000"),
        )
        self.assertEqual(
            reservation.released_quantity,
            Decimal("0.0000"),
        )

    def test_serial_expiry_releases_serial_without_movement(self):
        reservation, allocation = self._allocate_serial(
            expires_at=(
                timezone.now()
                + timedelta(hours=1)
            ),
        )
        movement_count = StockMovement.objects.count()

        expired = expire_stock_reservation(
            company=self.company,
            reservation=reservation,
            reason="Expire serial reservation",
            user=self.user,
            force=True,
        )

        self.serial_one.refresh_from_db()
        self.serial_stock_item.refresh_from_db()
        allocation.refresh_from_db()

        self.assertEqual(
            expired.status,
            StockReservationStatus.EXPIRED,
        )
        self.assertEqual(
            allocation.status,
            StockReservationAllocationStatus.RELEASED,
        )
        self.assertEqual(
            self.serial_one.status,
            InventorySerialStatus.AVAILABLE,
        )
        self.assertEqual(
            self.serial_stock_item.reserved_quantity,
            Decimal("0.0000"),
        )
        self.assertEqual(
            StockMovement.objects.count(),
            movement_count,
        )

    def test_tracked_allocation_rejects_cross_company_context(self):
        reservation, allocation = self._allocate_batch()

        with self.assertRaises(ValidationError):
            release_stock_reservation_allocation(
                company=self.other_company,
                allocation=allocation,
                user=self.user,
            )

        self.batch_stock_item.refresh_from_db()
        self.batch_balance.refresh_from_db()
        reservation.refresh_from_db()

        self.assertEqual(
            self.batch_stock_item.reserved_quantity,
            Decimal("4.0000"),
        )
        self.assertEqual(
            self.batch_balance.reserved_quantity,
            Decimal("4.0000"),
        )
        self.assertEqual(
            reservation.released_quantity,
            Decimal("0.0000"),
        )


# End Phase 22.3.3 Batch Serial Allocation and Release Tests
# ============================================================

# ============================================================
# Phase 22.3.4 - Stock Reservation API Tests
# ============================================================


class StockReservationAPITests(InventoryTestBase):
    """
    Company reservation API, permissions, lifecycle, and
    tenant-isolation coverage.
    """

    def setUp(self):
        super().setUp()

        self.profile, _created = (
            UserProfile.objects.get_or_create(
                user=self.user,
                defaults={
                    "display_name": "Reservation API User",
                    "default_company": self.company,
                },
            )
        )
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
        self.membership.role = CompanyRole.ADMIN
        self.membership.status = MembershipStatus.ACTIVE
        self.membership.is_primary = True
        self.membership.save()

        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        self.location = create_inventory_location(
            company=self.company,
            warehouse=self.warehouse,
            data={
                "code": "RES-API-BIN",
                "name": "Reservation API Bin",
                "location_type": InventoryLocationType.BIN,
                "is_default": True,
                "is_pickable": True,
            },
            user=self.user,
        )

        self.stock_item = get_or_create_stock_item(
            company=self.company,
            warehouse=self.warehouse,
            location=self.location,
            item=self.product,
            user=self.user,
        )
        self.stock_item.quantity_on_hand = Decimal("10.0000")
        self.stock_item.save(
            update_fields=[
                "quantity_on_hand",
                "updated_at",
            ]
        )

        self.order = create_sales_order(
            company=self.company,
            user=self.user,
            branch_id=self.branch.id,
            items=[
                {
                    "catalog_item_id": self.product.id,
                    "quantity": "4.0000",
                }
            ],
        )
        self.order.status = "CONFIRMED"
        self.order.save(
            update_fields=[
                "status",
                "updated_at",
            ]
        )
        self.order_item = self.order.items.get()

    def _create_reservation_api(self):
        return self.client.post(
            reverse(
                "company:company_inventory_reservation_create"
            ),
            {
                "sales_order_id": self.order.id,
                "company_id": self.other_company.id,
                "notes": "API reservation",
            },
            format="json",
        )

    def test_create_reservation_uses_current_company(self):
        response = self._create_reservation_api()

        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.data["success"])

        reservation = StockReservation.objects.get(
            id=response.data["reservation"]["id"],
        )

        self.assertEqual(reservation.company, self.company)
        self.assertEqual(reservation.sales_order, self.order)
        self.assertEqual(
            reservation.requested_quantity,
            Decimal("4.0000"),
        )

    def test_reservation_list_and_detail(self):
        create_response = self._create_reservation_api()
        reservation_id = create_response.data[
            "reservation"
        ]["id"]

        list_response = self.client.get(
            reverse(
                "company:company_inventory_reservations_list"
            )
        )
        detail_response = self.client.get(
            reverse(
                "company:company_inventory_reservation_detail",
                kwargs={
                    "reservation_id": reservation_id,
                },
            )
        )

        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(list_response.data["count"], 1)
        self.assertEqual(detail_response.status_code, 200)
        self.assertEqual(
            detail_response.data["reservation"]["id"],
            reservation_id,
        )

    def test_standard_allocation_and_release_api(self):
        create_response = self._create_reservation_api()
        reservation_id = create_response.data[
            "reservation"
        ]["id"]

        allocate_response = self.client.post(
            reverse(
                "company:company_inventory_reservation_allocate",
                kwargs={
                    "reservation_id": reservation_id,
                },
            ),
            {
                "allocation_type": "STANDARD",
                "sales_order_item_id": self.order_item.id,
                "stock_item_id": self.stock_item.id,
                "quantity": "2.0000",
            },
            format="json",
        )

        self.assertEqual(allocate_response.status_code, 201)

        allocation = StockReservationAllocation.objects.get(
            reservation_id=reservation_id,
        )

        self.stock_item.refresh_from_db()
        self.assertEqual(
            self.stock_item.reserved_quantity,
            Decimal("2.0000"),
        )

        release_response = self.client.post(
            reverse(
                (
                    "company:"
                    "company_inventory_reservation_"
                    "allocation_release"
                ),
                kwargs={
                    "reservation_id": reservation_id,
                    "allocation_id": allocation.id,
                },
            ),
            {
                "quantity": "1.0000",
                "reason": "API partial release",
            },
            format="json",
        )

        self.assertEqual(release_response.status_code, 200)

        self.stock_item.refresh_from_db()
        self.assertEqual(
            self.stock_item.reserved_quantity,
            Decimal("1.0000"),
        )

    def test_cancel_api_releases_remaining_stock(self):
        create_response = self._create_reservation_api()
        reservation_id = create_response.data[
            "reservation"
        ]["id"]

        self.client.post(
            reverse(
                "company:company_inventory_reservation_allocate",
                kwargs={
                    "reservation_id": reservation_id,
                },
            ),
            {
                "allocation_type": "STANDARD",
                "sales_order_item_id": self.order_item.id,
                "stock_item_id": self.stock_item.id,
                "quantity": "2.0000",
            },
            format="json",
        )

        response = self.client.post(
            reverse(
                "company:company_inventory_reservation_cancel",
                kwargs={
                    "reservation_id": reservation_id,
                },
            ),
            {
                "reason": "API cancellation",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)

        reservation = StockReservation.objects.get(
            id=reservation_id,
        )
        self.stock_item.refresh_from_db()

        self.assertEqual(
            reservation.status,
            StockReservationStatus.CANCELLED,
        )
        self.assertEqual(
            self.stock_item.reserved_quantity,
            Decimal("0.0000"),
        )

    def test_cross_company_reservation_detail_returns_404(self):
        other_order = create_sales_order(
            company=self.other_company,
            user=self.user,
            branch_id=self.other_branch.id,
            items=[
                {
                    "catalog_item_id": self.other_product.id,
                    "quantity": "1.0000",
                }
            ],
        )
        other_order.status = "CONFIRMED"
        other_order.save(
            update_fields=[
                "status",
                "updated_at",
            ]
        )

        other_reservation = (
            create_sales_order_stock_reservation(
                company=self.other_company,
                sales_order=other_order,
                user=self.user,
            )
        )

        response = self.client.get(
            reverse(
                "company:company_inventory_reservation_detail",
                kwargs={
                    "reservation_id": other_reservation.id,
                },
            )
        )

        self.assertEqual(response.status_code, 404)

    def test_viewer_cannot_create_reservation(self):
        self.membership.role = CompanyRole.VIEWER
        self.membership.save(
            update_fields=[
                "role",
                "updated_at",
            ]
        )

        response = self._create_reservation_api()

        self.assertEqual(response.status_code, 403)
        self.assertFalse(
            StockReservation.objects.filter(
                company=self.company,
                sales_order=self.order,
            ).exists()
        )


# End Phase 22.3.4 - Stock Reservation API Tests
# ============================================================

# ============================================================
# Phase 22.4 - Goods Issues Tests
# ============================================================


class GoodsIssueLifecycleTests(InventoryTestBase):
    """
    Goods issue services, reservation consumption, and tenant isolation.
    """

    def setUp(self):
        super().setUp()

        self.location = create_inventory_location(
            company=self.company,
            warehouse=self.warehouse,
            data={
                "code": "GOODS-ISSUE-BIN",
                "name": "Goods Issue Bin",
                "location_type": InventoryLocationType.BIN,
                "is_default": True,
                "is_pickable": True,
            },
            user=self.user,
        )

        self.stock_item = get_or_create_stock_item(
            company=self.company,
            warehouse=self.warehouse,
            location=self.location,
            item=self.product,
            user=self.user,
        )
        self.stock_item.quantity_on_hand = Decimal("10.0000")
        self.stock_item.reserved_quantity = Decimal("0.0000")
        self.stock_item.average_cost = Decimal("10.00")
        self.stock_item.save(
            update_fields=[
                "quantity_on_hand",
                "reserved_quantity",
                "average_cost",
                "updated_at",
            ]
        )

        self.customer = BusinessParty.objects.create(
            company=self.company,
            branch=self.branch,
            party_type=BusinessPartyType.CUSTOMER,
            status=BusinessPartyStatus.ACTIVE,
            code="GI-CUST-001",
            display_name="Goods Issue Customer",
            created_by=self.user,
        )

        self.order = create_sales_order(
            company=self.company,
            user=self.user,
            branch_id=self.branch.id,
            customer_id=self.customer.id,
            items=[
                {
                    "catalog_item_id": self.product.id,
                    "quantity": "4.0000",
                }
            ],
        )
        self.order.status = "CONFIRMED"
        self.order.save(
            update_fields=[
                "status",
                "updated_at",
            ]
        )
        self.order_item = self.order.items.get()

        self.reservation = (
            create_sales_order_stock_reservation(
                company=self.company,
                sales_order=self.order,
                user=self.user,
            )
        )
        self.allocation = allocate_stock_reservation(
            company=self.company,
            reservation=self.reservation,
            sales_order_item=self.order_item,
            stock_item=self.stock_item,
            quantity="4.0000",
            user=self.user,
        )

    def test_create_goods_issue_from_reservation_allocation(self):
        issue = create_goods_issue(
            company=self.company,
            user=self.user,
            payload={
                "sales_order_id": self.order.id,
                "warehouse_id": self.warehouse.id,
                "items": [
                    {
                        "reservation_allocation_id": (
                            self.allocation.id
                        ),
                        "quantity": "2.0000",
                    }
                ],
            },
        )

        self.assertEqual(issue.company, self.company)
        self.assertEqual(issue.sales_order, self.order)
        self.assertEqual(issue.status, GoodsIssueStatus.DRAFT)
        self.assertEqual(issue.items.count(), 1)

        issue_item = issue.items.get()

        self.assertEqual(
            issue_item.reservation_allocation,
            self.allocation,
        )
        self.assertEqual(
            issue_item.quantity,
            Decimal("2.0000"),
        )
        self.assertIsNone(issue_item.stock_movement)

    def test_post_goods_issue_consumes_reserved_stock(self):
        issue = create_goods_issue(
            company=self.company,
            user=self.user,
            payload={
                "sales_order_id": self.order.id,
                "warehouse_id": self.warehouse.id,
                "items": [
                    {
                        "reservation_allocation_id": (
                            self.allocation.id
                        ),
                        "quantity": "2.0000",
                    }
                ],
            },
        )

        issue = post_goods_issue(
            issue=issue,
            user=self.user,
        )

        self.stock_item.refresh_from_db()
        self.allocation.refresh_from_db()
        self.reservation.refresh_from_db()
        issue_item = issue.items.get()

        self.assertEqual(
            issue.status,
            GoodsIssueStatus.POSTED,
        )
        self.assertEqual(
            self.stock_item.quantity_on_hand,
            Decimal("8.0000"),
        )
        self.assertEqual(
            self.stock_item.reserved_quantity,
            Decimal("2.0000"),
        )
        self.assertEqual(
            self.allocation.fulfilled_quantity,
            Decimal("2.0000"),
        )
        self.assertEqual(
            self.reservation.fulfilled_quantity,
            Decimal("2.0000"),
        )
        self.assertIsNotNone(
            issue_item.stock_movement_id,
        )
        self.assertEqual(
            issue_item.stock_movement.status,
            StockMovementStatus.POSTED,
        )

    def test_post_goods_issue_is_idempotent(self):
        issue = create_goods_issue(
            company=self.company,
            user=self.user,
            payload={
                "sales_order_id": self.order.id,
                "warehouse_id": self.warehouse.id,
                "items": [
                    {
                        "reservation_allocation_id": (
                            self.allocation.id
                        ),
                        "quantity": "2.0000",
                    }
                ],
            },
        )

        post_goods_issue(
            issue=issue,
            user=self.user,
        )
        movement_count = StockMovement.objects.count()

        same_issue = post_goods_issue(
            issue=issue,
            user=self.user,
        )

        self.stock_item.refresh_from_db()
        self.allocation.refresh_from_db()

        self.assertEqual(
            same_issue.status,
            GoodsIssueStatus.POSTED,
        )
        self.assertEqual(
            StockMovement.objects.count(),
            movement_count,
        )
        self.assertEqual(
            self.stock_item.quantity_on_hand,
            Decimal("8.0000"),
        )
        self.assertEqual(
            self.allocation.fulfilled_quantity,
            Decimal("2.0000"),
        )

    def test_goods_issue_rejects_cross_company_order(self):
        other_order = create_sales_order(
            company=self.other_company,
            user=self.user,
            branch_id=self.other_branch.id,
            items=[
                {
                    "catalog_item_id": self.other_product.id,
                    "quantity": "1.0000",
                }
            ],
        )
        other_order.status = "CONFIRMED"
        other_order.save(
            update_fields=[
                "status",
                "updated_at",
            ]
        )

        with self.assertRaises(ValidationError):
            create_goods_issue(
                company=self.company,
                user=self.user,
                payload={
                    "sales_order_id": other_order.id,
                    "warehouse_id": self.warehouse.id,
                    "items": [
                        {
                            "sales_order_item_id": (
                                other_order.items.get().id
                            ),
                            "stock_item_id": self.stock_item.id,
                            "quantity": "1.0000",
                        }
                    ],
                },
            )

    def test_cancel_draft_goods_issue(self):
        issue = create_goods_issue(
            company=self.company,
            user=self.user,
            payload={
                "sales_order_id": self.order.id,
                "warehouse_id": self.warehouse.id,
                "items": [
                    {
                        "reservation_allocation_id": (
                            self.allocation.id
                        ),
                        "quantity": "1.0000",
                    }
                ],
            },
        )

        cancelled = cancel_goods_issue(
            issue=issue,
            reason="Customer delayed shipment",
            user=self.user,
        )

        self.stock_item.refresh_from_db()
        self.allocation.refresh_from_db()

        self.assertEqual(
            cancelled.status,
            GoodsIssueStatus.CANCELLED,
        )
        self.assertEqual(
            cancelled.cancellation_reason,
            "Customer delayed shipment",
        )
        self.assertEqual(
            self.stock_item.quantity_on_hand,
            Decimal("10.0000"),
        )
        self.assertEqual(
            self.allocation.fulfilled_quantity,
            Decimal("0.0000"),
        )

    def test_serialize_goods_issue(self):
        issue = create_goods_issue(
            company=self.company,
            user=self.user,
            payload={
                "sales_order_id": self.order.id,
                "warehouse_id": self.warehouse.id,
                "items": [
                    {
                        "reservation_allocation_id": (
                            self.allocation.id
                        ),
                        "quantity": "1.0000",
                    }
                ],
            },
        )

        data = serialize_goods_issue(
            issue,
            include_items=True,
        )

        self.assertEqual(data["id"], issue.id)
        self.assertEqual(data["status"], GoodsIssueStatus.DRAFT)
        self.assertEqual(len(data["items"]), 1)
        self.assertTrue(data["allowed_actions"]["post"])


# End Phase 22.4 - Goods Issues Tests
# ============================================================

# ============================================================
# Phase 22.5 - Physical Inventory and Cycle Count Tests
# ============================================================


class PhysicalInventoryCountTests(InventoryTestBase):
    """
    Physical inventory count models, services, variance posting,
    and tenant-isolation coverage.
    """

    def setUp(self):
        super().setUp()

        self.location = create_inventory_location(
            company=self.company,
            warehouse=self.warehouse,
            data={
                "code": "PIC-BIN-001",
                "name": "Physical Count Bin",
                "location_type": InventoryLocationType.BIN,
                "is_default": True,
                "is_pickable": True,
            },
            user=self.user,
        )

        self.stock_item = get_or_create_stock_item(
            company=self.company,
            warehouse=self.warehouse,
            location=self.location,
            item=self.product,
            user=self.user,
        )
        self.stock_item.quantity_on_hand = Decimal("10.0000")
        self.stock_item.reserved_quantity = Decimal("0.0000")
        self.stock_item.average_cost = Decimal("12.00")
        self.stock_item.full_clean()
        self.stock_item.save(
            update_fields=[
                "quantity_on_hand",
                "reserved_quantity",
                "average_cost",
                "updated_at",
            ]
        )

    def _create_count(self):
        return create_physical_inventory_count(
            company=self.company,
            warehouse=self.warehouse,
            location=self.location,
            data={
                "scope": PhysicalInventoryCountScope.LOCATION,
                "notes": "Cycle count test",
                "include_current_stock": True,
            },
            user=self.user,
        )

    def test_create_physical_inventory_count_snapshots_stock(self):
        count = self._create_count()

        self.assertEqual(count.company, self.company)
        self.assertEqual(count.warehouse, self.warehouse)
        self.assertEqual(count.location, self.location)
        self.assertEqual(
            count.status,
            PhysicalInventoryCountStatus.DRAFT,
        )
        self.assertEqual(count.items.count(), 1)

        count_item = count.items.get()

        self.assertEqual(count_item.stock_item, self.stock_item)
        self.assertEqual(
            count_item.system_quantity,
            Decimal("10.0000"),
        )
        self.assertEqual(
            count_item.counted_quantity,
            Decimal("10.0000"),
        )
        self.assertEqual(
            count_item.variance_quantity,
            Decimal("0.0000"),
        )
        self.assertEqual(
            count.total_system_quantity,
            Decimal("10.0000"),
        )

    def test_post_physical_inventory_negative_variance(self):
        count = self._create_count()
        count_item = count.items.get()

        set_physical_inventory_count_item_quantity(
            company=self.company,
            count_item=count_item,
            counted_quantity="7.0000",
            notes="Actual shelf count",
        )

        mark_physical_inventory_count_counted(
            company=self.company,
            count=count,
            user=self.user,
        )

        posted = post_physical_inventory_count(
            company=self.company,
            count=count,
            user=self.user,
            post_accounting=False,
        )

        self.stock_item.refresh_from_db()
        count_item.refresh_from_db()

        self.assertEqual(
            posted.status,
            PhysicalInventoryCountStatus.POSTED,
        )
        self.assertEqual(
            self.stock_item.quantity_on_hand,
            Decimal("7.0000"),
        )
        self.assertIsNotNone(count_item.stock_movement_id)
        self.assertEqual(
            count_item.stock_movement.movement_type,
            StockMovementType.ADJUSTMENT,
        )
        self.assertEqual(
            count_item.stock_movement.direction,
            StockMovementDirection.DECREASE,
        )
        self.assertEqual(
            count_item.stock_movement.quantity,
            Decimal("3.0000"),
        )

    def test_post_physical_inventory_positive_variance(self):
        count = self._create_count()
        count_item = count.items.get()

        set_physical_inventory_count_item_quantity(
            company=self.company,
            count_item=count_item,
            counted_quantity="13.0000",
        )
        mark_physical_inventory_count_counted(
            company=self.company,
            count=count,
            user=self.user,
        )

        post_physical_inventory_count(
            company=self.company,
            count=count,
            user=self.user,
            post_accounting=False,
        )

        self.stock_item.refresh_from_db()
        count_item.refresh_from_db()

        self.assertEqual(
            self.stock_item.quantity_on_hand,
            Decimal("13.0000"),
        )
        self.assertEqual(
            count_item.stock_movement.direction,
            StockMovementDirection.INCREASE,
        )
        self.assertEqual(
            count_item.stock_movement.quantity,
            Decimal("3.0000"),
        )

    def test_post_physical_inventory_zero_variance_creates_no_movement(self):
        count = self._create_count()

        mark_physical_inventory_count_counted(
            company=self.company,
            count=count,
            user=self.user,
        )

        movement_count = StockMovement.objects.count()

        post_physical_inventory_count(
            company=self.company,
            count=count,
            user=self.user,
            post_accounting=False,
        )

        count_item = count.items.get()
        self.stock_item.refresh_from_db()

        self.assertEqual(
            self.stock_item.quantity_on_hand,
            Decimal("10.0000"),
        )
        self.assertIsNone(count_item.stock_movement_id)
        self.assertEqual(
            StockMovement.objects.count(),
            movement_count,
        )

    def test_post_physical_inventory_is_idempotent(self):
        count = self._create_count()
        count_item = count.items.get()

        set_physical_inventory_count_item_quantity(
            company=self.company,
            count_item=count_item,
            counted_quantity="8.0000",
        )
        mark_physical_inventory_count_counted(
            company=self.company,
            count=count,
            user=self.user,
        )

        first = post_physical_inventory_count(
            company=self.company,
            count=count,
            user=self.user,
            post_accounting=False,
        )
        movement_count = StockMovement.objects.count()

        second = post_physical_inventory_count(
            company=self.company,
            count=first,
            user=self.user,
            post_accounting=False,
        )

        self.stock_item.refresh_from_db()

        self.assertEqual(
            second.status,
            PhysicalInventoryCountStatus.POSTED,
        )
        self.assertEqual(
            StockMovement.objects.count(),
            movement_count,
        )
        self.assertEqual(
            self.stock_item.quantity_on_hand,
            Decimal("8.0000"),
        )

    def test_cancel_unposted_physical_inventory_count(self):
        count = self._create_count()

        cancelled = cancel_physical_inventory_count(
            company=self.company,
            count=count,
            reason="Count postponed",
            user=self.user,
        )

        self.assertEqual(
            cancelled.status,
            PhysicalInventoryCountStatus.CANCELLED,
        )
        self.assertEqual(
            cancelled.cancellation_reason,
            "Count postponed",
        )

    def test_physical_inventory_count_rejects_cross_company_context(self):
        count = self._create_count()

        with self.assertRaises(ValidationError):
            validate_physical_inventory_count_for_company(
                company=self.other_company,
                count=count,
            )

    def test_build_physical_inventory_count_payload(self):
        count = self._create_count()

        payload = build_physical_inventory_count_payload(
            count,
            include_items=True,
        )

        self.assertEqual(payload["id"], count.id)
        self.assertEqual(payload["status"], PhysicalInventoryCountStatus.DRAFT)
        self.assertEqual(payload["scope"], PhysicalInventoryCountScope.LOCATION)
        self.assertEqual(len(payload["items"]), 1)
        self.assertTrue(payload["allowed_actions"]["start"])


# End Phase 22.5 - Physical Inventory and Cycle Count Tests
# ============================================================

# ============================================================
# Phase 22.5.1 - Physical Inventory Count API Tests
# ============================================================


class PhysicalInventoryCountAPITests(InventoryTestBase):
    """
    Company physical inventory count API, permissions, lifecycle,
    and tenant-isolation coverage.
    """

    def setUp(self):
        super().setUp()

        self.profile, _created = UserProfile.objects.get_or_create(
            user=self.user,
            defaults={
                "display_name": "Physical Count API User",
                "default_company": self.company,
                "is_system_user": False,
            },
        )
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
        self.membership.role = CompanyRole.ADMIN
        self.membership.status = MembershipStatus.ACTIVE
        self.membership.is_primary = True
        self.membership.save()

        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        self.location = create_inventory_location(
            company=self.company,
            warehouse=self.warehouse,
            data={
                "code": "PIC-API-BIN",
                "name": "Physical Count API Bin",
                "location_type": InventoryLocationType.BIN,
                "is_default": True,
                "is_pickable": True,
            },
            user=self.user,
        )

        self.stock_item = get_or_create_stock_item(
            company=self.company,
            warehouse=self.warehouse,
            location=self.location,
            item=self.product,
            user=self.user,
        )
        self.stock_item.quantity_on_hand = Decimal("9.0000")
        self.stock_item.reserved_quantity = Decimal("0.0000")
        self.stock_item.average_cost = Decimal("11.00")
        self.stock_item.full_clean()
        self.stock_item.save(
            update_fields=[
                "quantity_on_hand",
                "reserved_quantity",
                "average_cost",
                "updated_at",
            ]
        )

    def _create_count_api(self):
        return self.client.post(
            "/api/company/inventory/physical-counts/create/",
            {
                "company_id": self.other_company.id,
                "warehouse_id": self.warehouse.id,
                "location_id": self.location.id,
                "scope": PhysicalInventoryCountScope.LOCATION,
                "include_current_stock": True,
                "notes": "API physical count",
            },
            format="json",
        )

    def test_create_physical_count_uses_current_company(self):
        response = self._create_count_api()

        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.data["success"])

        count = PhysicalInventoryCount.objects.get(
            id=response.data["physical_count"]["id"],
        )

        self.assertEqual(count.company, self.company)
        self.assertEqual(count.warehouse, self.warehouse)
        self.assertEqual(count.location, self.location)
        self.assertEqual(count.items.count(), 1)

    def test_physical_count_list_and_detail(self):
        create_response = self._create_count_api()
        count_id = create_response.data["physical_count"]["id"]

        list_response = self.client.get(
            "/api/company/inventory/physical-counts/"
        )
        detail_response = self.client.get(
            f"/api/company/inventory/physical-counts/{count_id}/"
        )

        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(list_response.data["count"], 1)
        self.assertEqual(detail_response.status_code, 200)
        self.assertEqual(
            detail_response.data["physical_count"]["id"],
            count_id,
        )
        self.assertEqual(
            detail_response.data["physical_count"]["items_count"],
            1,
        )

    def test_update_mark_counted_and_post_physical_count(self):
        create_response = self._create_count_api()
        count_id = create_response.data["physical_count"]["id"]
        item_id = create_response.data["physical_count"]["items"][0]["id"]

        update_response = self.client.patch(
            (
                "/api/company/inventory/physical-counts/"
                f"{count_id}/items/{item_id}/"
            ),
            {
                "counted_quantity": "6.0000",
                "notes": "API counted quantity",
            },
            format="json",
        )

        self.assertEqual(update_response.status_code, 200)
        self.assertEqual(
            update_response.data["count_item"]["variance_quantity"],
            "-3.0000",
        )

        counted_response = self.client.post(
            (
                "/api/company/inventory/physical-counts/"
                f"{count_id}/mark-counted/"
            ),
            {},
            format="json",
        )

        self.assertEqual(counted_response.status_code, 200)
        self.assertEqual(
            counted_response.data["physical_count"]["status"],
            PhysicalInventoryCountStatus.COUNTED,
        )

        post_response = self.client.post(
            f"/api/company/inventory/physical-counts/{count_id}/post/",
            {
                "post_accounting": False,
            },
            format="json",
        )

        self.assertEqual(post_response.status_code, 200)
        self.assertEqual(
            post_response.data["physical_count"]["status"],
            PhysicalInventoryCountStatus.POSTED,
        )

        self.stock_item.refresh_from_db()

        self.assertEqual(
            self.stock_item.quantity_on_hand,
            Decimal("6.0000"),
        )

        count_item = PhysicalInventoryCountItem.objects.get(id=item_id)
        self.assertIsNotNone(count_item.stock_movement_id)

    def test_cancel_physical_count_api(self):
        create_response = self._create_count_api()
        count_id = create_response.data["physical_count"]["id"]

        response = self.client.post(
            f"/api/company/inventory/physical-counts/{count_id}/cancel/",
            {
                "reason": "API postponed",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data["physical_count"]["status"],
            PhysicalInventoryCountStatus.CANCELLED,
        )
        self.assertEqual(
            response.data["physical_count"]["cancellation_reason"],
            "API postponed",
        )

    def test_physical_count_hides_other_company_detail(self):
        other_location = create_inventory_location(
            company=self.other_company,
            warehouse=self.other_warehouse,
            data={
                "code": "OTHER-PIC-API-BIN",
                "name": "Other Physical Count API Bin",
                "location_type": InventoryLocationType.BIN,
                "is_default": True,
            },
            user=self.user,
        )

        other_stock_item = get_or_create_stock_item(
            company=self.other_company,
            warehouse=self.other_warehouse,
            location=other_location,
            item=self.other_product,
            user=self.user,
        )
        other_stock_item.quantity_on_hand = Decimal("4.0000")
        other_stock_item.full_clean()
        other_stock_item.save(
            update_fields=[
                "quantity_on_hand",
                "updated_at",
            ]
        )

        other_count = create_physical_inventory_count(
            company=self.other_company,
            warehouse=self.other_warehouse,
            location=other_location,
            data={
                "scope": PhysicalInventoryCountScope.LOCATION,
                "include_current_stock": True,
            },
            user=self.user,
        )

        response = self.client.get(
            f"/api/company/inventory/physical-counts/{other_count.id}/"
        )

        self.assertEqual(response.status_code, 404)

    def test_viewer_cannot_create_physical_count(self):
        self.membership.role = CompanyRole.VIEWER
        self.membership.save(
            update_fields=[
                "role",
                "updated_at",
            ]
        )

        response = self._create_count_api()

        self.assertEqual(response.status_code, 403)
        self.assertFalse(
            PhysicalInventoryCount.objects.filter(
                company=self.company,
            ).exists()
        )


# End Phase 22.5.1 - Physical Inventory Count API Tests
# ============================================================
