import os
from unittest import TestCase
from unittest.mock import patch
from integrations.mham_legacy.live_source import PrimeyMigrationLiveAdapter

class MhamOAuthAdapterTests(TestCase):
    def test_bootstrap_when_token_absent(self):
        old=dict(os.environ)
        try:
            os.environ.pop("MHAM_LEGACY_API_TOKEN",None)
            with patch("integrations.mham_legacy.oauth.prepare_runtime_environment") as prep, patch("integrations.mham_legacy.live_source.MhamLegacyClient.from_environment",return_value=object()) as factory:
                prep.side_effect=lambda: os.environ.update(MHAM_LEGACY_API_BASE_URL="https://mhamcloud.sa/connector/api",MHAM_LEGACY_API_TOKEN="runtime")
                PrimeyMigrationLiveAdapter.from_environment()
                prep.assert_called_once_with();factory.assert_called_once_with()
        finally:
            os.environ.clear();os.environ.update(old)

    def test_existing_token_skips_oauth(self):
        old=dict(os.environ)
        try:
            os.environ["MHAM_LEGACY_API_BASE_URL"]="https://mhamcloud.sa/connector/api"
            os.environ["MHAM_LEGACY_API_TOKEN"]="existing"
            with patch("integrations.mham_legacy.oauth.prepare_runtime_environment") as prep, patch("integrations.mham_legacy.live_source.MhamLegacyClient.from_environment",return_value=object()):
                PrimeyMigrationLiveAdapter.from_environment()
                prep.assert_not_called()
        finally:
            os.environ.clear();os.environ.update(old)
