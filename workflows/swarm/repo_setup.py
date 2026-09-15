"""
Repository preparation — clone linked GitHub repos or init a local workspace.

Extracted from workflows/swarm_orchestrator.py. Call from the Foreman workflow
with run_activity / post_message bound to workflow.execute_activity and adk.messages.
"""
from __future__ import annotations

import json
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

    # Greenfield workspaces stay local until the user links GitHub on the workspace.
    # Do not auto-create a remote repo just because a token is configured.
    return repo_path, github_url, None
