"""Merge workspace brief and artifact text into the effective task goal."""
from __future__ import annotations

from api.repositories import artifacts as artifacts_repo
from api.repositories import projects as projects_repo


async def build_effective_goal(
    goal: str,
    *,
    project_id: str,
    org_id: str,
    artifact_ids: list[str] | None = None,
    include_workspace_brief: bool = True,
) -> str:
    parts: list[str] = []

    if include_workspace_brief:
        project = await projects_repo.get_project(project_id, org_id=org_id)
        brief = (project or {}).get("instructions") or ""
        if brief.strip():
            parts.append(f"--- Workspace brief ---\n{brief.strip()}")

    trimmed = goal.strip()
    if trimmed:
        parts.append(trimmed)

    for artifact_id in artifact_ids or []:
        artifact = await artifacts_repo.get_artifact(artifact_id, org_id=org_id)
        if not artifact:
            continue
        if artifact.get("project_id") != project_id:
            continue
        text = artifact.get("text_extract") or ""
        if text.strip():
            parts.append(f"--- Attached: {artifact['filename']} ---\n{text.strip()}")

    return "\n\n".join(parts).strip()
