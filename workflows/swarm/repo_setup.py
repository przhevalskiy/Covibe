"""
Repository preparation — clone, init, or auto-create GitHub repo.

Extracted from workflows/swarm_orchestrator.py. Call from the Foreman workflow
with run_activity / post_message bound to workflow.execute_activity and adk.messages.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Awaitable, Callable


RunActivity = Callable[..., Awaitable[str]]
PostMessage = Callable[[str], Awaitable[None]]


async def prepare_repository(
    *,
    task_id: str,
    repo_path: str,
    github_url: str,
    github_token: str,
    project_id: str,
    run_activity: RunActivity,
    post_message: PostMessage,
) -> tuple[str, str, str | None]:
    """Prepare the working repo. Returns (repo_path, github_url, error_or_none)."""
    effective_token = github_token

    if github_url:
        await post_message(f"[Foreman] Cloning repository: {github_url}")

        clone_result_json = await run_activity(
            "swarm_git_clone",
            [github_url, repo_path, effective_token or None],
        )
        try:
            clone_result = json.loads(clone_result_json)
        except Exception:
            clone_result = {"ok": False, "message": clone_result_json}

        if not clone_result.get("ok"):
            err = clone_result.get("message", "unknown error")
            await post_message(f"[Foreman] ✗ Clone failed: {err}")
            return repo_path, github_url, f"[Foreman] Clone failed: {err}"

        if effective_token:
            await run_activity(
                "swarm_git_configure_remote",
                [repo_path, effective_token, github_url],
            )

        await post_message(f"[Foreman] ✓ Repository ready at {repo_path}")
        return repo_path, github_url, None

    await run_activity(
        "swarm_run_command",
        [
            (
                "git rev-parse HEAD > /dev/null 2>&1 || ("
                "git init && "
                'git config user.email "swarm@gantry.local" && '
                'git config user.name "Gantry Swarm" && '
                'git commit --allow-empty -m "chore: initialise repository"'
                ")"
            ),
            repo_path,
        ],
    )

    if effective_token and project_id:
        project_name = Path(repo_path).name
        await post_message(f"[Foreman] Creating GitHub repository '{project_name}'...")

        create_json = await run_activity(
            "swarm_github_create_repo",
            [project_name, effective_token, True],
        )
        try:
            create_result = json.loads(create_json)
        except Exception:
            create_result = {"ok": False, "message": create_json}

        if create_result.get("ok"):
            github_url = create_result["github_url"]
            await run_activity(
                "swarm_git_configure_remote",
                [repo_path, effective_token, github_url],
            )
            await run_activity(
                "swarm_update_project_registry",
                [project_id, github_url],
            )
            await post_message(f"[Foreman] ✓ GitHub repo created: {github_url}")
        else:
            await post_message(
                f"[Foreman] ⚠ Could not create GitHub repo: "
                f"{create_result.get('message', '')} — continuing with local build."
            )

    return repo_path, github_url, None
