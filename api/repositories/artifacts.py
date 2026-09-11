"""Artifact storage — DB metadata + files under project .gantry/artifacts/."""
from __future__ import annotations

import json
import mimetypes
import re
from pathlib import Path
from typing import Any
from uuid import uuid4

from api import db
from api.repositories import projects as projects_repo
from api.services.project_files import project_root

_TEXT_TYPES = frozenset({"text/plain", "text/markdown", "application/json"})
_TEXT_EXT = frozenset({".txt", ".md", ".markdown", ".json", ".yaml", ".yml", ".csv"})


def _artifacts_dir(project: dict) -> Path:
    root = project_root(project)
    path = root / ".gantry" / "artifacts"
    path.mkdir(parents=True, exist_ok=True)
    return path


def _registry_index(project: dict) -> Path:
    return _artifacts_dir(project) / "index.json"


def _load_registry(project: dict) -> list[dict]:
    path = _registry_index(project)
    if not path.exists():
        return []
    try:
        return json.loads(path.read_text())
    except Exception:
        return []


def _save_registry(project: dict, rows: list[dict]) -> None:
    _registry_index(project).write_text(json.dumps(rows, indent=2))


def _row_to_artifact(row: dict) -> dict:
    return {
        "id": str(row["id"]),
        "org_id": str(row.get("org_id", "")),
        "project_id": str(row["project_id"]),
        "task_id": row.get("task_id"),
        "scope": row.get("scope", "run"),
        "filename": row["filename"],
        "content_type": row.get("content_type", "text/plain"),
        "size_bytes": int(row.get("size_bytes") or 0),
        "text_extract": row.get("text_extract"),
        "created_at": row["created_at"].isoformat()
        if hasattr(row.get("created_at"), "isoformat")
        else row.get("created_at"),
    }


def _guess_content_type(filename: str) -> str:
    guessed, _ = mimetypes.guess_type(filename)
    return guessed or "application/octet-stream"


def _extract_text(content: bytes, filename: str, content_type: str) -> str | None:
    ext = Path(filename).suffix.lower()
    if content_type in _TEXT_TYPES or ext in _TEXT_EXT:
        try:
            return content.decode("utf-8", errors="replace")
        except Exception:
            return None
    return None


async def create_artifact(
    *,
    org_id: str,
    project_id: str,
    filename: str,
    content: bytes,
    scope: str = "run",
    task_id: str | None = None,
    content_type: str | None = None,
) -> dict:
    project = await projects_repo.get_project(project_id, org_id=org_id)
    if not project:
        raise ValueError("project not found")

    safe_name = re.sub(r"[^\w.\- ]+", "_", Path(filename).name).strip() or "upload"
    ctype = content_type or _guess_content_type(safe_name)
    text_extract = _extract_text(content, safe_name, ctype)
    artifact_id = str(uuid4())
    storage_rel = f".gantry/artifacts/{artifact_id}/{safe_name}"
    storage_abs = project_root(project) / ".gantry" / "artifacts" / artifact_id / safe_name
    storage_abs.parent.mkdir(parents=True, exist_ok=True)
    storage_abs.write_bytes(content)

    record = {
        "id": artifact_id,
        "org_id": org_id,
        "project_id": project_id,
        "task_id": task_id,
        "scope": scope,
        "filename": safe_name,
        "content_type": ctype,
        "size_bytes": len(content),
        "storage_path": storage_rel,
        "text_extract": text_extract,
    }

    if db.is_available():
        row = await db.fetch_one(
            """
            INSERT INTO artifacts (
                id, org_id, project_id, task_id, scope,
                filename, content_type, size_bytes, storage_path, text_extract
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (
                artifact_id,
                org_id,
                project_id,
                task_id,
                scope,
                safe_name,
                ctype,
                len(content),
                storage_rel,
                text_extract,
            ),
        )
        return _row_to_artifact(row)

    rows = _load_registry(project)
    from datetime import datetime, timezone

    record["created_at"] = datetime.now(timezone.utc).isoformat()
    rows.append(record)
    _save_registry(project, rows)
    return record


async def get_artifact(artifact_id: str, *, org_id: str | None = None) -> dict | None:
    if db.is_available():
        if org_id:
            row = await db.fetch_one(
                "SELECT * FROM artifacts WHERE id = %s AND org_id = %s",
                (artifact_id, org_id),
            )
        else:
            row = await db.fetch_one("SELECT * FROM artifacts WHERE id = %s", (artifact_id,))
        return _row_to_artifact(row) if row else None

    if not org_id:
        return None
    # Registry fallback — scan projects is expensive; lookup via project list
    projects = await projects_repo.list_projects(org_id=org_id)
    for project in projects:
        for row in _load_registry(project):
            if row.get("id") == artifact_id:
                return row
    return None


async def list_artifacts(
    *,
    org_id: str,
    project_id: str,
    task_id: str | None = None,
    scope: str | None = None,
) -> list[dict]:
    project = await projects_repo.get_project(project_id, org_id=org_id)
    if not project:
        return []

    if db.is_available():
        clauses = ["project_id = %s", "org_id = %s"]
        params: list[Any] = [project_id, org_id]
        if task_id:
            clauses.append("task_id = %s")
            params.append(task_id)
        if scope:
            clauses.append("scope = %s")
            params.append(scope)
        rows = await db.fetch_all(
            f"SELECT * FROM artifacts WHERE {' AND '.join(clauses)} ORDER BY created_at DESC",
            tuple(params),
        )
        return [_row_to_artifact(r) for r in rows]

    rows = _load_registry(project)
    out = [r for r in rows if r.get("org_id") == org_id]
    if task_id:
        out = [r for r in out if r.get("task_id") == task_id]
    if scope:
        out = [r for r in out if r.get("scope") == scope]
    return sorted(out, key=lambda r: r.get("created_at", ""), reverse=True)


async def delete_artifact(artifact_id: str, *, org_id: str) -> bool:
    artifact = await get_artifact(artifact_id, org_id=org_id)
    if not artifact:
        return False

    project = await projects_repo.get_project(artifact["project_id"], org_id=org_id)
    if project:
        storage_abs = project_root(project) / artifact["storage_path"]
        if storage_abs.exists():
            storage_abs.unlink(missing_ok=True)
            parent = storage_abs.parent
            if parent.exists() and not any(parent.iterdir()):
                parent.rmdir()

    if db.is_available():
        await db.execute(
            "DELETE FROM artifacts WHERE id = %s AND org_id = %s",
            (artifact_id, org_id),
        )
        return True

    if project:
        rows = [r for r in _load_registry(project) if r.get("id") != artifact_id]
        _save_registry(project, rows)
    return True
