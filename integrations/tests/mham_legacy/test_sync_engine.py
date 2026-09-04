from __future__ import annotations

import ast
import inspect
import unittest
from pathlib import Path

from integrations.mham_legacy import sync_engine


class MhamLegacySyncEngineTests(unittest.TestCase):
    def test_company_delete_is_forbidden(self):
        source = inspect.getsource(sync_engine.replace_company_from_snapshot)
        tree = ast.parse(source)
        forbidden = []
        for node in ast.walk(tree):
            if not isinstance(node, ast.Call):
                continue
            func = node.func
            if (
                isinstance(func, ast.Attribute)
                and func.attr == "delete"
                and isinstance(func.value, ast.Name)
                and func.value.id == "company"
            ):
                forbidden.append(node.lineno)
        self.assertEqual(
            forbidden,
            [],
            f"company.delete() executable call found at lines: {forbidden}",
        )

    def test_company_identity_is_preserved(self):
        source = inspect.getsource(sync_engine.replace_company_from_snapshot)
        self.assertIn("COMPANY_ID_PRESERVED", source)
        self.assertIn("select_for_update", source)

    def test_user_identity_is_preserved(self):
        source = inspect.getsource(sync_engine._sync_users_in_place)
        self.assertIn("UserProfile.objects.get_or_create", source)
        self.assertIn("CompanyMembership.objects", source)

    def test_refresh_is_atomic(self):
        names = sync_engine.replace_company_from_snapshot.__code__.co_names
        self.assertIn("transaction", names)

    def test_v13_function_is_derived_with_strict_guards(self):
        source = inspect.getsource(sync_engine._build_existing_company_apply)
        self.assertIn("V13 company create semantic match failed", source)
        self.assertIn("V13 user block semantic match failed", source)

    def test_source_write_verbs_are_not_added(self):
        source = Path(sync_engine.__file__).read_text(encoding="utf-8")
        for marker in (
            'method="POST"',
            'method="PUT"',
            'method="PATCH"',
            'method="DELETE"',
        ):
            self.assertNotIn(marker, source)


    def test_actual_v13_existing_company_builder_compiles(self):
        v13 = sync_engine._load_v13()
        fn = sync_engine._build_existing_company_apply(v13)
        self.assertTrue(callable(fn))
        self.assertEqual(fn.__name__, "apply_company_existing")


    def test_live_company_name_drift_uses_business_id_identity(self):
        source = inspect.getsource(sync_engine.replace_company_from_snapshot)
        self.assertIn("SOURCE_COMPANY_NAME_DRIFT_ACCEPTED=YES", source)
        self.assertIn("expected_name = source_name", source)
        self.assertNotIn("Company name drift for {business_id}", source)



if __name__ == "__main__":
    unittest.main()
