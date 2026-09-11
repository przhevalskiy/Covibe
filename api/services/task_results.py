"""Structured task result resolution (Invariant I3).

Priority order:
  1. builds table (worker-written via db_upsert_build)
  2. api_tasks columns / meta (pr_url, branch)
  3. Agentex message scrape (legacy fallback only)
"""
from __future__ import annotations

import re
from typing import Any

import structlog

from api.repositories import builds as builds_repo
from api.repositories import tasks as tasks_repo

log = structlog.get_logger(__name__)

_PR_URL_RE = re.compile(r"https://github\.com/\S+/pull/\d+")


def extract_pr_url_from_messages(messages: list[dict]) -> str | None:
    """Legacy fallback — prefer builds table or task meta (I3)."""
    for msg in reversed(messages):
        content = msg.get("content", "")
        if isinstance(content, str) and "/pull/" in content:
            match = _PR_URL_RE.search(content)
            if match:
                return match.group(0)
    return None


def extract_branch_from_messages(messages: list[dict], task_id: str) -> str | None:
    """Legacy fallback — prefer builds table or task meta (I3)."""
    for msg in reversed(messages):
        content = msg.get("content", "")
        if isinstance(content, str):
            match = re.search(
                rf"branch[:\s]+(\S*{re.escape(task_id[:8])}\S*)",
                content,
                re.I,
            )
            if match:
                return match.group(1)
    return None


async def resolve_terminal_result(
    task_id: str,
    *,
    org_id: str | None = None,
    messages: list[dict] | None = None,
) -> dict[str, Any]:
    """Return structured {pr_url, branch, ...} for a terminal task."""
    result: dict[str, Any] = {}

    stored = await tasks_repo.get_task_result(task_id, org_id=org_id)
    if stored:
        result.update(stored)

    if result.get("pr_url") and result.get("branch"):
        return _compact(result)

    build = await builds_repo.get_build(task_id, org_id=org_id)
    if build:
        for key in ("pr_url", "branch", "quality_score", "tier", "heal_cycles", "files_changed"):
            if build.get(key) is not None:
                result.setdefault(key, build[key])
        if build.get("result"):
            result.update({k: v for k, v in build["result"].items() if v is not None})

    if result.get("pr_url") and result.get("branch"):
        return _compact(result)

    if messages:
        scraped_pr = extract_pr_url_from_messages(messages)
        scraped_branch = extract_branch_from_messages(messages, task_id)
        if scraped_pr and not result.get("pr_url"):
            log.warning("task_result_message_scrape", task_id=task_id, field="pr_url")
            result["pr_url"] = scraped_pr
        if scraped_branch and not result.get("branch"):
            log.warning("task_result_message_scrape", task_id=task_id, field="branch")
            result["branch"] = scraped_branch

    return _compact(result)


def _compact(result: dict[str, Any]) -> dict[str, Any]:
    return {k: v for k, v in result.items() if v is not None}
