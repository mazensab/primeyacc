from __future__ import annotations

import re
from typing import Any

import bcrypt
from django.contrib.auth.hashers import BasePasswordHasher, mask_hash


_HASH_RE = re.compile(r"^\$(?:2y|2b|2a)\$\d{2}\$[./A-Za-z0-9]{53}$")


class LaravelBCryptPasswordHasher(BasePasswordHasher):
    """Verification-only support for imported Laravel/PHP bcrypt hashes."""

    algorithm = "laravel_bcrypt"

    def encode(self, password: str, salt: str | bytes | None = None) -> str:
        raise ValueError("This compatibility hasher is verification-only.")

    def _source_hash(self, encoded: str) -> str:
        prefix = f"{self.algorithm}$"
        if not isinstance(encoded, str) or not encoded.startswith(prefix):
            raise ValueError("Invalid Laravel bcrypt wrapper.")
        source_hash = encoded[len(prefix):]
        if not _HASH_RE.fullmatch(source_hash):
            raise ValueError("Malformed Laravel bcrypt hash.")
        return source_hash

    def verify(self, password: str, encoded: str) -> bool:
        try:
            source_hash = self._source_hash(encoded)
            raw = str(password).encode("utf-8")[:72]
            return bool(bcrypt.checkpw(raw, source_hash.encode("ascii")))
        except (TypeError, ValueError, UnicodeError):
            return False

    def safe_summary(self, encoded: str) -> dict[str, Any]:
        source_hash = self._source_hash(encoded)
        return {
            "algorithm": self.algorithm,
            "work factor": source_hash[4:6],
            "salt": mask_hash(source_hash[7:29]),
            "checksum": mask_hash(source_hash[29:]),
        }

    def must_update(self, encoded: str) -> bool:
        self._source_hash(encoded)
        return False

    def harden_runtime(self, password: str, encoded: str) -> None:
        return None
