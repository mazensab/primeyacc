# ============================================================
# 📂 inventory/tests.py
# 🧠 PrimeyAcc | Company Inventory Tests V1.0
# ------------------------------------------------------------
# ✅ Warehouse model/service tests
# ✅ Stock item balance tests
# ✅ Stock movement posting tests
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
# ============================================================

from __future__ import annotations

from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase

from catalog.models import CatalogItem, CatalogItemType, CatalogUnit
from companies.models import Branch, Company
from inventory.models import (
    QUANTITY_ZERO,
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
from inventory.services import (
    adjust_stock,
    create_stock_movement,
    create_warehouse,
    get_active_company_warehouses,
    get_company_stock_items,
    get_company_stock_movements,
    get_company_warehouses,
    get_or_create_stock_item,
    issue_stock,
    receive_stock,
    set_warehouse_status,
    transfer_stock,
    update_warehouse,
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
        stock_item = StockItem.objects.create(
            company=self.company,
            warehouse=self.warehouse,
            item=self.product,
            quantity_on_hand=Decimal("10.0000"),
            reserved_quantity=Decimal("2.0000"),
        )

        self.assertEqual(stock_item.available_quantity, Decimal("8.0000"))

    def test_stock_item_reserved_quantity_cannot_exceed_on_hand(self):
        stock_item = StockItem(
            company=self.company,
            warehouse=self.warehouse,
            item=self.product,
            quantity_on_hand=Decimal("1.0000"),
            reserved_quantity=Decimal("2.0000"),
        )

        with self.assertRaises(ValidationError):
            stock_item.full_clean()

    def test_stock_item_minimum_and_maximum_validation(self):
        stock_item = StockItem(
            company=self.company,
            warehouse=self.warehouse,
            item=self.product,
            quantity_on_hand=Decimal("1.0000"),
            minimum_quantity=Decimal("10.0000"),
            maximum_quantity=Decimal("5.0000"),
        )

        with self.assertRaises(ValidationError):
            stock_item.full_clean()


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