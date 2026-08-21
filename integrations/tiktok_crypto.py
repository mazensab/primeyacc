from __future__ import annotations

from django.conf import settings
from cryptography.fernet import Fernet, InvalidToken


class TikTokTokenEncryptionError(RuntimeError):
    pass


def _get_fernet() -> Fernet:
    raw_key = str(
        getattr(settings, "TIKTOK_TOKEN_ENCRYPTION_KEY", "") or ""
    ).strip()

    if not raw_key:
        raise TikTokTokenEncryptionError(
            "TIKTOK_TOKEN_ENCRYPTION_KEY is not configured."
        )

    try:
        return Fernet(raw_key.encode("ascii"))
    except Exception as exc:
        raise TikTokTokenEncryptionError(
            "TIKTOK_TOKEN_ENCRYPTION_KEY is invalid."
        ) from exc


def encrypt_token(value: str) -> str:
    clean_value = str(value or "").strip()

    if not clean_value:
        return ""

    token = _get_fernet().encrypt(
        clean_value.encode("utf-8")
    )

    return token.decode("ascii")


def decrypt_token(value: str) -> str:
    clean_value = str(value or "").strip()

    if not clean_value:
        return ""

    try:
        raw = _get_fernet().decrypt(
            clean_value.encode("ascii")
        )
    except InvalidToken as exc:
        raise TikTokTokenEncryptionError(
            "Stored TikTok token could not be decrypted."
        ) from exc

    return raw.decode("utf-8")
