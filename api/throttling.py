from __future__ import annotations

import hashlib

from rest_framework.throttling import SimpleRateThrottle


class LoginRateThrottle(SimpleRateThrottle):
    scope = "auth_login"
    rate = "10/min"

    def get_cache_key(self, request, view):
        remote_ident = self.get_ident(request)
        data = getattr(request, "data", {}) or {}
        login_ident = ""

        for key in (
            "username",
            "email",
            "identifier",
            "phone",
            "mobile",
            "whatsapp_number",
        ):
            value = data.get(key)

            if value not in (None, ""):
                login_ident = str(value).strip().lower()
                break

        digest = hashlib.sha256(
            login_ident.encode("utf-8")
        ).hexdigest()[:24]

        return self.cache_format % {
            "scope": self.scope,
            "ident": f"{remote_ident}:{digest}",
        }
