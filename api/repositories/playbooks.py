"""Org-scoped playbooks (Skills) — config overlays for the swarm pipeline."""
from __future__ import annotations

import json
import re
from typing import Any
from uuid import UUID, uuid4

from api import db
from schemas.playbooks import SYSTEM_PLAYBOOKS, spec_from_row, validate_playbook_config

_SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9_-]{0,63}$")


def _to_slug(label: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", label.lower().strip())
    slug = re.sub(r"-+", "-", slug).strip("-")
    return slug[:64] or f"playbook-{uuid4().hex[:8]}"


def _row_to_playbook(row: dict) -> dict:
    config = row.get("config") or {}
    if isinstance(config, str):
        config = json.loads(config)
    return {
        "id": str(row["id"]),
        "org_id": str(row["org_id"]),
        "slug": row["slug"],
        "label": row["label"],
        "description": row.get("description"),
        "config": config,
        "workspace_id": str(row["workspace_id"]) if row.get("workspace_id") else None,
        "is_system": bool(row.get("is_system")),
        "created_at": row["created_at"].isoformat()
        if hasattr(row.get("created_at"), "isoformat")
        else row.get("created_at"),
        "updated_at": row["updated_at"].isoformat()
        if hasattr(row.get("updated_at"), "isoformat")
        else row.get("updated_at"),
    }


def _system_fallback(org_id: str, playbook_id: str) -> dict | None:
    spec = SYSTEM_PLAYBOOKS.get(playbook_id)
    if not spec:
        return None
    return {
        "id": playbook_id,
        "org_id": org_id,
        "slug": playbook_id,
        "label": spec.get("label", playbook_id),
        "description": None,
        "config": spec_from_row(spec),
        "workspace_id": None,
        "is_system": True,
        "created_at": None,
        "updated_at": None,
    }


async def list_playbooks(
    *,
    org_id: str,
    workspace_id: str | None = None,
) -> list[dict]:
    if not db.is_available():
        return [_system_fallback(org_id, slug) for slug in SYSTEM_PLAYBOOKS if _system_fallback(org_id, slug)]

    params: list[Any] = [org_id]
    sql = """
        SELECT * FROM playbooks
        WHERE org_id = %s
    """
    if workspace_id:
        sql += " AND (workspace_id IS NULL OR workspace_id = %s::uuid)"
        params.append(workspace_id)
    sql += " ORDER BY is_system DESC, label ASC"

    rows = await db.fetch_all(sql, tuple(params))
    if rows:
        return [_row_to_playbook(r) for r in rows]

    await seed_system_playbooks(org_id)
    rows = await db.fetch_all(sql, tuple(params))
    return [_row_to_playbook(r) for r in rows]


async def get_playbook(*, org_id: str, playbook_id: str) -> dict | None:
    if not playbook_id:
        return None

    if not db.is_available():
        return _system_fallback(org_id, playbook_id)

    row = None
    try:
        UUID(playbook_id)
        row = await db.fetch_one(
            "SELECT * FROM playbooks WHERE org_id = %s AND id = %s::uuid",
            (org_id, playbook_id),
        )
    except ValueError:
        pass

    if not row:
        row = await db.fetch_one(
            "SELECT * FROM playbooks WHERE org_id = %s AND slug = %s",
            (org_id, playbook_id),
        )

    if row:
        return _row_to_playbook(row)

    return _system_fallback(org_id, playbook_id)


def playbook_to_spec(playbook: dict) -> dict[str, Any]:
    """Merge label into spec shape expected by resolve_submit_params."""
    config = dict(playbook.get("config") or {})
    config.setdefault("label", playbook.get("label", playbook.get("slug", "")))
    return config


async def create_playbook(
    *,
    org_id: str,
    label: str,
    config: dict[str, Any],
    slug: str | None = None,
    description: str | None = None,
    workspace_id: str | None = None,
) -> dict:
    validate_playbook_config(config)
    final_slug = (slug or _to_slug(label)).lower()
    if not _SLUG_RE.match(final_slug):
        raise ValueError("slug must be lowercase alphanumeric with hyphens/underscores")

    if not db.is_available():
        raise RuntimeError("database unavailable")

    playbook_id = str(uuid4())
    ws_clause = "%s::uuid" if workspace_id else "NULL"
    await db.execute(
        f"""
        INSERT INTO playbooks (id, org_id, slug, label, description, config, workspace_id, is_system)
        VALUES (%s::uuid, %s::uuid, %s, %s, %s, %s::jsonb, {ws_clause}, false)
        """,
        (
            playbook_id,
            org_id,
            final_slug,
            label.strip(),
            description,
            json.dumps(config),
            *([workspace_id] if workspace_id else []),
        ),
    )
    row = await db.fetch_one(
        "SELECT * FROM playbooks WHERE id = %s::uuid",
        (playbook_id,),
    )
    return _row_to_playbook(row)


async def _fetch_db_row(org_id: str, playbook_id: str) -> dict | None:
    try:
        UUID(playbook_id)
        row = await db.fetch_one(
            "SELECT * FROM playbooks WHERE org_id = %s AND id = %s::uuid",
            (org_id, playbook_id),
        )
        if row:
            return row
    except ValueError:
        pass
    return await db.fetch_one(
        "SELECT * FROM playbooks WHERE org_id = %s AND slug = %s",
        (org_id, playbook_id),
    )


async def update_playbook(
    *,
    org_id: str,
    playbook_id: str,
    label: str | None = None,
    description: str | None = None,
    config: dict[str, Any] | None = None,
    workspace_id: str | None = ...,  # type: ignore[assignment]
) -> dict | None:
    if not db.is_available():
        raise RuntimeError("database unavailable")

    row = await _fetch_db_row(org_id, playbook_id)
    if not row:
        return None

    if config is not None:
        validate_playbook_config(config)

    sets: list[str] = ["updated_at = now()"]
    params: list[Any] = []
    if label is not None:
        sets.append("label = %s")
        params.append(label.strip())
    if description is not None:
        sets.append("description = %s")
        params.append(description)
    if config is not None:
        sets.append("config = %s::jsonb")
        params.append(json.dumps(config))
    if workspace_id is not ...:
        sets.append("workspace_id = %s")
        params.append(workspace_id)

    params.extend([org_id, str(row["id"])])
    await db.execute(
        f"""
        UPDATE playbooks SET {", ".join(sets)}
        WHERE org_id = %s::uuid AND id = %s::uuid
        """,
        tuple(params),
    )
    return await get_playbook(org_id=org_id, playbook_id=str(row["id"]))


async def delete_playbook(*, org_id: str, playbook_id: str) -> bool:
    if not db.is_available():
        raise RuntimeError("database unavailable")

    row = await _fetch_db_row(org_id, playbook_id)
    if not row:
        return False
    if row.get("is_system"):
        raise ValueError("system playbooks cannot be deleted — fork or create a custom skill")

    await db.execute(
        "DELETE FROM playbooks WHERE org_id = %s::uuid AND id = %s::uuid",
        (org_id, str(row["id"])),
    )
    return True


async def seed_system_playbooks(org_id: str) -> None:
    """Insert built-in example playbooks for an org if missing."""
    if not db.is_available():
        return
    for slug, spec in SYSTEM_PLAYBOOKS.items():
        config = spec_from_row(spec)
        await db.execute(
            """
            INSERT INTO playbooks (org_id, slug, label, description, config, is_system)
            VALUES (%s::uuid, %s, %s, %s, %s::jsonb, true)
            ON CONFLICT (org_id, slug) DO NOTHING
            """,
            (
                org_id,
                slug,
                spec.get("label", slug),
                f"Built-in {spec.get('label', slug)} playbook",
                json.dumps(config),
            ),
        )
