from __future__ import annotations

import json
import secrets
from datetime import datetime, timedelta, timezone as dt_timezone
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from .models import TikTokConnection, TikTokVideo
from .tiktok_crypto import decrypt_token, encrypt_token


TIKTOK_AUTHORIZE_URL = "https://www.tiktok.com/v2/auth/authorize/"
TIKTOK_TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/"
TIKTOK_REVOKE_URL = "https://open.tiktokapis.com/v2/oauth/revoke/"
TIKTOK_USER_INFO_URL = "https://open.tiktokapis.com/v2/user/info/"
TIKTOK_VIDEO_LIST_URL = "https://open.tiktokapis.com/v2/video/list/"


class TikTokIntegrationError(RuntimeError):
    pass


def _config(name: str) -> str:
    return str(getattr(settings, name, "") or "").strip()


def ensure_tiktok_configured() -> None:
    missing = [
        name
        for name in (
            "TIKTOK_CLIENT_KEY",
            "TIKTOK_CLIENT_SECRET",
            "TIKTOK_REDIRECT_URI",
        )
        if not _config(name)
    ]

    if missing:
        raise TikTokIntegrationError(
            "TikTok integration is not configured: "
            + ", ".join(missing)
        )


def generate_oauth_state() -> str:
    return secrets.token_urlsafe(48)


def build_authorization_url(state: str) -> str:
    ensure_tiktok_configured()

    params = {
        "client_key": _config("TIKTOK_CLIENT_KEY"),
        "scope": _config("TIKTOK_SCOPES")
        or "user.info.basic,video.list",
        "response_type": "code",
        "redirect_uri": _config("TIKTOK_REDIRECT_URI"),
        "state": state,
    }

    return f"{TIKTOK_AUTHORIZE_URL}?{urlencode(params)}"


def _request_json(
    *,
    url: str,
    method: str = "GET",
    headers: dict[str, str] | None = None,
    form: dict[str, Any] | None = None,
    body: dict[str, Any] | None = None,
    timeout: int = 20,
) -> dict[str, Any]:
    request_headers = {
        "Accept": "application/json",
        "User-Agent": "MarilynClinics-TikTokIntegration/1.0",
        **(headers or {}),
    }

    data: bytes | None = None

    if form is not None:
        request_headers["Content-Type"] = "application/x-www-form-urlencoded"
        data = urlencode(form).encode("utf-8")

    elif body is not None:
        request_headers["Content-Type"] = "application/json"
        data = json.dumps(body).encode("utf-8")

    request = Request(
        url,
        data=data,
        headers=request_headers,
        method=method.upper(),
    )

    try:
        with urlopen(request, timeout=timeout) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw) if raw else {}

    except HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")

        try:
            payload = json.loads(raw)
        except json.JSONDecodeError:
            payload = {"detail": raw}

        raise TikTokIntegrationError(
            f"TikTok HTTP {exc.code}: {payload}"
        ) from exc

    except URLError as exc:
        raise TikTokIntegrationError(
            f"TikTok network error: {exc.reason}"
        ) from exc


def exchange_authorization_code(code: str) -> dict[str, Any]:
    ensure_tiktok_configured()

    if not code:
        raise TikTokIntegrationError("Missing TikTok authorization code.")

    payload = _request_json(
        url=TIKTOK_TOKEN_URL,
        method="POST",
        form={
            "client_key": _config("TIKTOK_CLIENT_KEY"),
            "client_secret": _config("TIKTOK_CLIENT_SECRET"),
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": _config("TIKTOK_REDIRECT_URI"),
        },
    )

    if payload.get("error"):
        raise TikTokIntegrationError(
            payload.get("error_description")
            or payload.get("error")
            or "TikTok token exchange failed."
        )

    return payload


def refresh_access_token(connection: TikTokConnection) -> TikTokConnection:
    ensure_tiktok_configured()

    encrypted_refresh_token = str(connection.refresh_token or "").strip()

    if not encrypted_refresh_token:
        raise TikTokIntegrationError("TikTok refresh token is missing.")

    refresh_token = decrypt_token(encrypted_refresh_token)

    payload = _request_json(
        url=TIKTOK_TOKEN_URL,
        method="POST",
        form={
            "client_key": _config("TIKTOK_CLIENT_KEY"),
            "client_secret": _config("TIKTOK_CLIENT_SECRET"),
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
        },
    )

    if payload.get("error"):
        raise TikTokIntegrationError(
            payload.get("error_description")
            or payload.get("error")
            or "TikTok token refresh failed."
        )

    now = timezone.now()

    connection.access_token = encrypt_token(
        str(payload.get("access_token") or "")
    )
    new_refresh_token = str(payload.get("refresh_token") or "").strip()

    connection.refresh_token = encrypt_token(
        new_refresh_token or refresh_token
    )

    connection.access_token_expires_at = (
        now + timedelta(seconds=int(payload.get("expires_in") or 0))
    )

    connection.refresh_token_expires_at = (
        now + timedelta(
            seconds=int(payload.get("refresh_expires_in") or 0)
        )
    )

    connection.scopes = [
        value.strip()
        for value in str(payload.get("scope") or "").split(",")
        if value.strip()
    ]

    connection.last_error = ""
    connection.save(
        update_fields=[
            "access_token",
            "refresh_token",
            "access_token_expires_at",
            "refresh_token_expires_at",
            "scopes",
            "last_error",
            "updated_at",
        ]
    )

    return connection


def get_valid_access_token(connection: TikTokConnection) -> str:
    if not connection.is_active:
        raise TikTokIntegrationError("TikTok connection is inactive.")

    expires_at = connection.access_token_expires_at

    if (
        connection.access_token
        and expires_at
        and expires_at > timezone.now() + timedelta(minutes=5)
    ):
        return decrypt_token(connection.access_token)

    connection = refresh_access_token(connection)

    if not connection.access_token:
        raise TikTokIntegrationError("TikTok access token is unavailable.")

    return decrypt_token(connection.access_token)


def fetch_user_info(connection: TikTokConnection) -> dict[str, Any]:
    access_token = get_valid_access_token(connection)

    fields = "open_id,union_id,avatar_url,display_name"

    payload = _request_json(
        url=f"{TIKTOK_USER_INFO_URL}?{urlencode({'fields': fields})}",
        headers={
            "Authorization": f"Bearer {access_token}",
        },
    )

    error = payload.get("error") or {}

    if error.get("code") not in (None, "", "ok"):
        raise TikTokIntegrationError(
            error.get("message") or error.get("code")
        )

    return (payload.get("data") or {}).get("user") or {}


def fetch_video_page(
    connection: TikTokConnection,
    *,
    cursor: int | None = None,
    max_count: int = 20,
) -> dict[str, Any]:
    access_token = get_valid_access_token(connection)

    fields = ",".join(
        [
            "id",
            "create_time",
            "cover_image_url",
            "share_url",
            "video_description",
            "duration",
            "height",
            "width",
            "title",
            "embed_link",
            "like_count",
            "comment_count",
            "share_count",
            "view_count",
        ]
    )

    body: dict[str, Any] = {
        "max_count": min(max(int(max_count), 1), 20),
    }

    if cursor is not None:
        body["cursor"] = int(cursor)

    payload = _request_json(
        url=f"{TIKTOK_VIDEO_LIST_URL}?{urlencode({'fields': fields})}",
        method="POST",
        headers={
            "Authorization": f"Bearer {access_token}",
        },
        body=body,
    )

    error = payload.get("error") or {}

    if error.get("code") not in (None, "", "ok"):
        raise TikTokIntegrationError(
            error.get("message") or error.get("code")
        )

    return payload.get("data") or {}


def _published_at(value: Any):
    try:
        timestamp = int(value)
    except (TypeError, ValueError):
        return None

    if timestamp <= 0:
        return None

    return datetime.fromtimestamp(
        timestamp,
        tz=dt_timezone.utc,
    )


@transaction.atomic
def persist_token_payload(payload: dict[str, Any]) -> TikTokConnection:
    open_id = str(payload.get("open_id") or "").strip()

    if not open_id:
        raise TikTokIntegrationError(
            "TikTok did not return an open_id."
        )

    now = timezone.now()

    connection, _ = TikTokConnection.objects.update_or_create(
        open_id=open_id,
        defaults={
            "access_token": encrypt_token(
                str(payload.get("access_token") or "")
            ),
            "refresh_token": encrypt_token(
                str(payload.get("refresh_token") or "")
            ),
            "access_token_expires_at": (
                now
                + timedelta(
                    seconds=int(payload.get("expires_in") or 0)
                )
            ),
            "refresh_token_expires_at": (
                now
                + timedelta(
                    seconds=int(
                        payload.get("refresh_expires_in") or 0
                    )
                )
            ),
            "scopes": [
                value.strip()
                for value in str(
                    payload.get("scope") or ""
                ).split(",")
                if value.strip()
            ],
            "is_active": True,
            "last_error": "",
        },
    )

    return connection


@transaction.atomic
def sync_tiktok_account(
    connection: TikTokConnection,
    *,
    max_pages: int | None = None,
) -> dict[str, int | bool]:
    try:
        user = fetch_user_info(connection)

        connection.display_name = str(
            user.get("display_name") or connection.display_name
        )
        connection.avatar_url = str(
            user.get("avatar_url") or connection.avatar_url
        )

        cursor: int | None = None
        page_number = 0
        seen_ids: set[str] = set()
        seen_cursors: set[int] = set()
        created_count = 0
        updated_count = 0
        hidden_count = 0
        sync_complete = False

        while max_pages is None or page_number < max(int(max_pages), 1):
            page = fetch_video_page(
                connection,
                cursor=cursor,
                max_count=20,
            )

            videos = page.get("videos") or []

            for video in videos:
                video_id = str(video.get("id") or "").strip()

                if not video_id:
                    continue

                seen_ids.add(video_id)

                _, created = TikTokVideo.objects.update_or_create(
                    tiktok_video_id=video_id,
                    defaults={
                        "connection": connection,
                        "title": str(video.get("title") or ""),
                        "description": str(
                            video.get("video_description") or ""
                        ),
                        "cover_image_url": str(
                            video.get("cover_image_url") or ""
                        ),
                        "share_url": str(
                            video.get("share_url") or ""
                        ),
                        "embed_link": str(
                            video.get("embed_link") or ""
                        ),
                        "duration": max(
                            int(video.get("duration") or 0),
                            0,
                        ),
                        "width": max(
                            int(video.get("width") or 0),
                            0,
                        ),
                        "height": max(
                            int(video.get("height") or 0),
                            0,
                        ),
                        "like_count": max(
                            int(video.get("like_count") or 0),
                            0,
                        ),
                        "comment_count": max(
                            int(video.get("comment_count") or 0),
                            0,
                        ),
                        "share_count": max(
                            int(video.get("share_count") or 0),
                            0,
                        ),
                        "view_count": max(
                            int(video.get("view_count") or 0),
                            0,
                        ),
                        "published_at": _published_at(
                            video.get("create_time")
                        ),
                        "is_visible": True,
                    },
                )

                if created:
                    created_count += 1
                else:
                    updated_count += 1

            page_number += 1

            if not page.get("has_more"):
                sync_complete = True
                break

            next_cursor = page.get("cursor")

            if next_cursor is None:
                raise TikTokIntegrationError(
                    "TikTok pagination returned has_more without a cursor."
                )

            next_cursor = int(next_cursor)

            if next_cursor in seen_cursors:
                raise TikTokIntegrationError(
                    "TikTok pagination cursor repeated."
                )

            seen_cursors.add(next_cursor)
            cursor = next_cursor

        if sync_complete:
            stale_videos = connection.videos.filter(is_visible=True)

            if seen_ids:
                stale_videos = stale_videos.exclude(tiktok_video_id__in=seen_ids)

            hidden_count = stale_videos.update(is_visible=False)

        connection.last_synced_at = timezone.now()
        connection.last_error = ""
        connection.save(
            update_fields=[
                "display_name",
                "avatar_url",
                "last_synced_at",
                "last_error",
                "updated_at",
            ]
        )

        return {
            "created": created_count,
            "updated": updated_count,
            "hidden": hidden_count,
            "seen": len(seen_ids),
            "pages": page_number,
            "complete": sync_complete,
        }

    except Exception as exc:
        connection.last_error = str(exc)[:2000]
        connection.save(
            update_fields=[
                "last_error",
                "updated_at",
            ]
        )
        raise


def revoke_connection(connection: TikTokConnection) -> None:
    ensure_tiktok_configured()

    token = decrypt_token(connection.access_token) if connection.access_token else ""

    if token:
        _request_json(
            url=TIKTOK_REVOKE_URL,
            method="POST",
            form={
                "client_key": _config("TIKTOK_CLIENT_KEY"),
                "client_secret": _config("TIKTOK_CLIENT_SECRET"),
                "token": token,
            },
        )

    connection.is_active = False
    connection.access_token = ""
    connection.refresh_token = ""
    connection.access_token_expires_at = None
    connection.refresh_token_expires_at = None
    connection.save(
        update_fields=[
            "is_active",
            "access_token",
            "refresh_token",
            "access_token_expires_at",
            "refresh_token_expires_at",
            "updated_at",
        ]
    )

