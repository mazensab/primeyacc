from __future__ import annotations

from unittest.mock import patch

from cryptography.fernet import Fernet
from django.test import TestCase, override_settings
from django.urls import reverse

from integrations.models import TikTokConnection, TikTokVideo
from integrations.tiktok_crypto import decrypt_token, encrypt_token
from integrations.tiktok_service import (
    TikTokIntegrationError,
    build_authorization_url,
    persist_token_payload,
)


TEST_FERNET_KEY = Fernet.generate_key().decode("ascii")


@override_settings(
    TIKTOK_TOKEN_ENCRYPTION_KEY=TEST_FERNET_KEY,
)
class TikTokCryptoTests(TestCase):
    def test_token_round_trip(self):
        raw = "secret-access-token"

        encrypted = encrypt_token(raw)

        self.assertNotEqual(encrypted, raw)
        self.assertEqual(decrypt_token(encrypted), raw)

    def test_empty_token_round_trip(self):
        self.assertEqual(encrypt_token(""), "")
        self.assertEqual(decrypt_token(""), "")


@override_settings(
    TIKTOK_TOKEN_ENCRYPTION_KEY=TEST_FERNET_KEY,
    TIKTOK_CLIENT_KEY="client-key",
    TIKTOK_CLIENT_SECRET="client-secret",
    TIKTOK_REDIRECT_URI="https://example.com/api/system/integrations/tiktok/callback/",
    TIKTOK_SCOPES="user.info.basic,video.list",
)
class TikTokServiceTests(TestCase):
    def test_authorization_url_contains_expected_values(self):
        url = build_authorization_url("state-value")

        self.assertIn("client_key=client-key", url)
        self.assertIn("response_type=code", url)
        self.assertIn("state=state-value", url)
        self.assertIn("video.list", url)

    def test_persist_token_payload_encrypts_tokens(self):
        payload = {
            "open_id": "open-id-123",
            "access_token": "plain-access",
            "refresh_token": "plain-refresh",
            "expires_in": 86400,
            "refresh_expires_in": 31536000,
            "scope": "user.info.basic,video.list",
        }

        connection = persist_token_payload(payload)

        self.assertNotEqual(
            connection.access_token,
            "plain-access",
        )
        self.assertNotEqual(
            connection.refresh_token,
            "plain-refresh",
        )

        self.assertEqual(
            decrypt_token(connection.access_token),
            "plain-access",
        )
        self.assertEqual(
            decrypt_token(connection.refresh_token),
            "plain-refresh",
        )


class TikTokConfigurationTests(TestCase):
    @override_settings(
        TIKTOK_CLIENT_KEY="",
        TIKTOK_CLIENT_SECRET="",
        TIKTOK_REDIRECT_URI="",
    )
    def test_authorization_url_requires_configuration(self):
        with self.assertRaises(TikTokIntegrationError):
            build_authorization_url("state-value")


class PublicTikTokApiTests(TestCase):
    def setUp(self):
        self.connection = TikTokConnection.objects.create(
            open_id="public-open-id",
            display_name="Marilyn Clinics",
            is_active=True,
        )

    def test_public_endpoint_returns_visible_video(self):
        TikTokVideo.objects.create(
            connection=self.connection,
            tiktok_video_id="video-1",
            title="Example video",
            description="Example description",
            cover_image_url="https://example.com/cover.jpg",
            share_url="https://www.tiktok.com/example",
            embed_link="https://www.tiktok.com/player/v1/video-1",
            is_visible=True,
        )

        response = self.client.get(
            reverse("public:social-tiktok-videos")
        )

        self.assertEqual(response.status_code, 200)

        payload = response.json()

        self.assertEqual(payload["count"], 1)
        self.assertEqual(
            payload["results"][0]["id"],
            "video-1",
        )
        self.assertEqual(
            payload["results"][0]["platform"],
            "tiktok",
        )

    def test_public_endpoint_hides_invisible_video(self):
        TikTokVideo.objects.create(
            connection=self.connection,
            tiktok_video_id="video-hidden",
            title="Hidden",
            is_visible=False,
        )

        response = self.client.get(
            reverse("public:social-tiktok-videos")
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["count"], 0)

    def test_public_endpoint_hides_inactive_connection(self):
        self.connection.is_active = False
        self.connection.save(update_fields=["is_active"])

        TikTokVideo.objects.create(
            connection=self.connection,
            tiktok_video_id="video-inactive",
            title="Inactive",
            is_visible=True,
        )

        response = self.client.get(
            reverse("public:social-tiktok-videos")
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["count"], 0)
