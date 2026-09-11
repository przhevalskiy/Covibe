"""Org-scoped playbooks (Skills) — CRUD for run config overlays."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from api.deps import require_any_scope, require_scope
from api.repositories import playbooks as playbooks_repo
from schemas.playbooks import validate_playbook_config

router = APIRouter(prefix="/v1/playbooks", tags=["Playbooks"])


class PlaybookConfig(BaseModel):
    vertical: str | None = None
    tier_default: int = Field(default=1, ge=0, le=3)
    branch_prefix: str = "swarm"
    goal_prefix: str = ""
    pipeline: dict[str, Any] = Field(
        default_factory=lambda: {"max_heal_cycles": 1, "max_parallel_tracks": 1},
    )
    architect_overlay: str | None = None
    inspector_overlay: str | None = None
    qa_commands: dict[str, str] = Field(default_factory=dict)
    oracle: dict[str, Any] | None = None

    def to_storage(self) -> dict[str, Any]:
        data = self.model_dump(exclude_none=True)
        if self.inspector_overlay or self.qa_commands:
            oracle = dict(data.pop("oracle", None) or {})
            if self.inspector_overlay:
                oracle["inspector_overlay"] = self.inspector_overlay
            if self.qa_commands:
                oracle["qa_commands"] = self.qa_commands
            data["oracle"] = oracle
        data.pop("inspector_overlay", None)
        data.pop("qa_commands", None)
        return data


class CreatePlaybookRequest(BaseModel):
    label: str
    slug: str | None = None
    description: str | None = None
    workspace_id: str | None = None
    config: PlaybookConfig


class UpdatePlaybookRequest(BaseModel):
    label: str | None = None
    description: str | None = None
    workspace_id: str | None = None
    config: PlaybookConfig | None = None


@router.get("")
async def list_playbooks(
    workspace_id: str | None = Query(default=None),
    key: dict = Depends(require_any_scope("projects:read", "projects:write", "tasks:read", "tasks:write")),
):
    rows = await playbooks_repo.list_playbooks(org_id=key["org_id"], workspace_id=workspace_id)
    return {"playbooks": rows}


@router.get("/{playbook_id}")
async def get_playbook(
    playbook_id: str,
    key: dict = Depends(require_any_scope("projects:read", "projects:write", "tasks:read", "tasks:write")),
):
    row = await playbooks_repo.get_playbook(org_id=key["org_id"], playbook_id=playbook_id)
    if not row:
        raise HTTPException(status_code=404, detail="playbook not found")
    return {"playbook": row}


@router.post("", status_code=201)
async def create_playbook(
    body: CreatePlaybookRequest,
    key: dict = Depends(require_scope("projects:write")),
):
    config = body.config.to_storage()
    try:
        validate_playbook_config(config)
        row = await playbooks_repo.create_playbook(
            org_id=key["org_id"],
            label=body.label,
            slug=body.slug,
            description=body.description,
            config=config,
            workspace_id=body.workspace_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    return {"playbook": row}


@router.patch("/{playbook_id}")
async def update_playbook(
    playbook_id: str,
    body: UpdatePlaybookRequest,
    key: dict = Depends(require_scope("projects:write")),
):
    config = body.config.to_storage() if body.config else None
    try:
        if config is not None:
            validate_playbook_config(config)
        row = await playbooks_repo.update_playbook(
            org_id=key["org_id"],
            playbook_id=playbook_id,
            label=body.label,
            description=body.description,
            config=config,
            workspace_id=body.workspace_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    if not row:
        raise HTTPException(status_code=404, detail="playbook not found")
    return {"playbook": row}


@router.delete("/{playbook_id}", status_code=204)
async def delete_playbook(
    playbook_id: str,
    key: dict = Depends(require_scope("projects:write")),
):
    try:
        deleted = await playbooks_repo.delete_playbook(org_id=key["org_id"], playbook_id=playbook_id)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    if not deleted:
        raise HTTPException(status_code=404, detail="playbook not found")
