"""
Human-in-the-loop helpers for SwarmOrchestrator.

Payload builders and workflow-id conventions — Temporal orchestration stays in the Foreman.
"""
from __future__ import annotations

import json


def approval_workflow_id(task_id: str, iteration: int, checkpoint: str) -> str:
    return f"{task_id}-r{iteration}-approval-{checkpoint}"


def build_hitl_meta_patch(
    checkpoint: str,
    action: str,
    workflow_id: str,
    *,
    questions: list[str] | None = None,
) -> dict:
    entry: dict = {
        "checkpoint": checkpoint,
        "workflow_id": workflow_id,
        "action": action,
    }
    if questions:
        entry["questions"] = questions
        entry["description"] = action
    return {"pending_hitl_add": entry}


def build_approval_request_content(checkpoint: str, action: str, workflow_id: str) -> str:
    payload = json.dumps({
        "checkpoint": checkpoint,
        "action": action,
        "workflow_id": workflow_id,
    })
    return f"__approval_request__{payload}"


def build_approval_resolved_content(checkpoint: str, approved: bool, workflow_id: str) -> str:
    payload = json.dumps({
        "checkpoint": checkpoint,
        "approved": approved,
        "workflow_id": workflow_id,
    })
    return f"__approval_resolved__{payload}"
