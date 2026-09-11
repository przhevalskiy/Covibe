import pytest

from api.services import goal_context


@pytest.mark.asyncio
async def test_build_effective_goal_includes_brief_and_artifacts(monkeypatch):
    async def fake_get_project(project_id, org_id=None, user_id=None):
        return {"id": project_id, "instructions": "Use TypeScript strict mode."}

    async def fake_get_artifact(artifact_id, org_id=None):
        return {
            "id": artifact_id,
            "project_id": "proj-1",
            "filename": "spec.md",
            "text_extract": "Build a chess game.",
        }

    monkeypatch.setattr(goal_context.projects_repo, "get_project", fake_get_project)
    monkeypatch.setattr(goal_context.artifacts_repo, "get_artifact", fake_get_artifact)

    result = await goal_context.build_effective_goal(
        "Add multiplayer",
        project_id="proj-1",
        org_id="org-1",
        artifact_ids=["art-1"],
        include_workspace_brief=True,
    )

    assert "--- Workspace brief ---" in result
    assert "Use TypeScript strict mode." in result
    assert "Add multiplayer" in result
    assert "--- Attached: spec.md ---" in result
    assert "Build a chess game." in result
