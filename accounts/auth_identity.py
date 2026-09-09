# ============================================================
# 📂 accounts/auth_identity.py
# 🧠 Mhamcloud | Unified Login Identity Resolver V1
# ------------------------------------------------------------
# ✅ Username / email / phone / mobile / WhatsApp identifiers
# ✅ Saudi phone-format normalization
# ✅ Ambiguous matches fail closed
# ✅ Shared by login API and secure password setup command
# ------------------------------------------------------------
# Security rules:
# - Never authenticate by company/branch phone numbers.
# - Only Django User and its UserProfile identity fields are eligible.
# - Never select the first result when an identifier matches multiple users.
# ============================================================

from __future__ import annotations

from dataclasses import dataclass
import re
from typing import Any

from django.contrib.auth import get_user_model
from django.db.models import Q, QuerySet


_ARABIC_DIGIT_TRANSLATION = str.maketrans(
    "٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹",
    "01234567890123456789",
)
_PHONE_SEPARATOR_RE = re.compile(r"[\s().-]+")


@dataclass(frozen=True, slots=True)
class LoginIdentityResolution:
    identifier: str
    user: Any | None
    match_type: str | None
    match_count: int
    candidates: tuple[str, ...]

    @property
    def found(self) -> bool:
        return self.user is not None and self.match_count == 1

    @property
    def ambiguous(self) -> bool:
        return self.match_count > 1


def clean_login_identifier(value: Any) -> str:
    return str(value or "").strip().translate(_ARABIC_DIGIT_TRANSLATION)


def normalize_phone_candidates(value: Any) -> tuple[str, ...]:
    """
    Return safe equivalent forms for a Saudi mobile identifier.

    Examples treated as equivalent:
    - 0501234567
    - 501234567
    - 966501234567
    - +966501234567
    - 00966501234567

    Non-phone identifiers are returned unchanged only.
    """
    identifier = clean_login_identifier(value)
    if not identifier:
        return ()

    compact = _PHONE_SEPARATOR_RE.sub("", identifier)
    phone_like = all(char.isdigit() or char == "+" for char in compact)

    if not phone_like:
        return (identifier,)

    digits = "".join(char for char in compact if char.isdigit())
    candidates = {identifier, compact, digits}

    national = digits
    if national.startswith("00966"):
        national = national[5:]
    elif national.startswith("966"):
        national = national[3:]
    elif national.startswith("0"):
        national = national[1:]

    if len(national) == 9 and national.startswith("5"):
        local = f"0{national}"
        international = f"966{national}"
        candidates.update(
            {
                national,
                local,
                international,
                f"+{international}",
                f"00{international}",
            }
        )

    return tuple(sorted(item for item in candidates if item))


def _materialize_unique(
    queryset: QuerySet,
) -> tuple[Any | None, int]:
    matches = list(queryset.order_by("pk")[:2])
    if len(matches) == 1:
        return matches[0], 1
    return None, len(matches)


def resolve_login_identity(value: Any) -> LoginIdentityResolution:
    """
    Resolve one login identifier to exactly one Django user.

    Resolution priority:
    1. Exact Django username.
    2. Exact email.
    3. Normalized username/email/profile phone aliases.

    Multiple matches are intentionally rejected instead of choosing the first
    row, because silently selecting an account is unsafe.
    """
    identifier = clean_login_identifier(value)
    if not identifier:
        return LoginIdentityResolution("", None, None, 0, ())

    User = get_user_model()
    manager = User._default_manager
    username_field = getattr(User, "USERNAME_FIELD", "username")

    user, count = _materialize_unique(
        manager.filter(**{f"{username_field}__iexact": identifier})
    )
    if count:
        return LoginIdentityResolution(
            identifier,
            user,
            "username" if user else None,
            count,
            (identifier,),
        )

    user_field_names = {
        field.name
        for field in User._meta.get_fields()
        if getattr(field, "concrete", False)
    }

    if "email" in user_field_names:
        user, count = _materialize_unique(
            manager.filter(email__iexact=identifier)
        )
        if count:
            return LoginIdentityResolution(
                identifier,
                user,
                "email" if user else None,
                count,
                (identifier,),
            )

    candidates = normalize_phone_candidates(identifier)
    query: Q | None = None

    for candidate in candidates:
        candidate_query = Q(
            **{f"{username_field}__iexact": candidate}
        )

        if "email" in user_field_names:
            candidate_query |= Q(email__iexact=candidate)

        candidate_query |= (
            Q(Mhamcloud_profile__phone__iexact=candidate)
            | Q(Mhamcloud_profile__mobile__iexact=candidate)
            | Q(Mhamcloud_profile__whatsapp_number__iexact=candidate)
        )

        query = candidate_query if query is None else query | candidate_query

    if query is None:
        return LoginIdentityResolution(
            identifier,
            None,
            None,
            0,
            candidates,
        )

    user, count = _materialize_unique(
        manager.filter(query).distinct()
    )

    return LoginIdentityResolution(
        identifier,
        user,
        "normalized_identifier" if user else None,
        count,
        candidates,
    )
