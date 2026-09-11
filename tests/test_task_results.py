"""Tests for structured task result resolution (Invariant I3)."""
import pytest

from api.repositories import builds as builds_repo
from api.repositories import projects as projects_repo
from api.repositories import tasks as tasks_repo
from api.repositories.organizations import DEFAULT_ORG_ID
from api.services.task_results import (
    extract_branch_from_messages,
    extract_pr_url_from_messages,
    resolve_terminal_result,
)


@pytest.fixture
def isolated_gantry_home(tmp_path, monkeypatch):
    gantry_home = tmp_path / ".gantry"
    projects_base = gantry_home / "projects"
    projects_base.mkdir(parents=True)
    monkeypatch.setenv("GANTRY_HOME", str(gantry_home))
    monkeypatch.setenv("GANTRY_FILES_BASE", str(projects_base))
    monkeypatch.delenv("DATABASE_URL", raising=False)
    return gantry_home


def test_extract_pr_url_from_messages_fallback():
    messages = [
        {"content": "Working on the branch..."},
        {"content": "PR ready: https://github.com/acme/repo/pull/42"},
    ]
    assert extract_pr_url_from_messages(messages) == "https://github.com/acme/repo/pull/42"


def test_extract_branch_from_messages_fallback():
    task_id = "task_abc12345"
    messages = [{"content": f"Pushed branch: swarm/{task_id[:8]}-feat"}]
    assert extract_branch_from_messages(messages, task_id) == f"swarm/{task_id[:8]}-feat"


@pytest.mark.asyncio
async def test_resolve_terminal_result_prefers_build_over_messages(isolated_gantry_home):
    task_id = "task_structured"
    project = await projects_repo.create_project(
        "App",
        org_id=DEFAULT_ORG_ID,
        user_id="api",
        github_url="https://github.com/acme/app",
    )
    await tasks_repo.save_task(
        task_id=task_id,
        org_id=DEFAULT_ORG_ID,
        project_id=project["id"],
        source="api",
    )
    await builds_repo.upsert_build(
        task_id=task_id,
        project_id=project["id"],
        org_id=DEFAULT_ORG_ID,
        branch="swarm/task_structured",
        pr_url="https://github.com/acme/app/pull/99",
        result={"pr_url": "https://github.com/acme/app/pull/99", "branch": "swarm/task_structured"},
    )

    messages = [{"content": "https://github.com/wrong/repo/pull/1"}]
    result = await resolve_terminal_result(task_id, org_id=DEFAULT_ORG_ID, messages=messages)

    assert result["pr_url"] == "https://github.com/acme/app/pull/99"
    assert result["branch"] == "swarm/task_structured"
