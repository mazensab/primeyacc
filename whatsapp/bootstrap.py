from __future__ import annotations

import logging
from typing import Any

from django.db import DEFAULT_DB_ALIAS, connections

logger = logging.getLogger(__name__)


def seed_system_templates_after_migrate(
    *,
    using: str = DEFAULT_DB_ALIAS,
    plan: list[Any] | None = None,
    **kwargs: Any,
) -> None:
    """Reconcile Primey system templates after a normal forward migrate."""
    if using != DEFAULT_DB_ALIAS:
        return

    if plan and any(bool(backwards) for _migration, backwards in plan):
        logger.info(
            "Primey system template bootstrap skipped during reverse migration."
        )
        return

    connection = connections[using]
    required_tables = {
        "companies_company",
        "whatsapp_whatsapptemplate",
    }
    existing_tables = set(connection.introspection.table_names())

    if not required_tables.issubset(existing_tables):
        logger.warning(
            "Primey system template bootstrap skipped because required tables "
            "are not available yet."
        )
        return

    from whatsapp.services import seed_system_whatsapp_ready_templates

    result = seed_system_whatsapp_ready_templates()
    logger.info(
        "Primey system template bootstrap complete: total=%s created=%s updated=%s",
        result.get("total_count"),
        result.get("created_count"),
        result.get("updated_count"),
    )
