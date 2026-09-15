"""Normalize Agentex task messages into stable chronological order."""
from __future__ import annotations

import json
from datetime import datetime
from typing import Any


def _parse_timestamp(value: Any) -> float:
    if value is None:
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip()
    if not text:
        return 0.0
    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00")).timestamp()
    except ValueError:
        return 0.0


def message_key(message: dict[str, Any]) -> str:
    """Stable identity for deduplication across polls and SSE."""
    msg_id = message.get("id")
    if msg_id:
        return f"id:{msg_id}"

    created_at = message.get("created_at") or message.get("timestamp")
    content = message.get("content")
    if created_at and content is not None:
        try:
            payload = json.dumps(content, sort_keys=True, default=str)
        except TypeError:
            payload = str(content)
        return f"ts:{created_at}:{payload}"

    try:
        return f"hash:{hash(json.dumps(message, sort_keys=True, default=str))}"
    except TypeError:
        return f"hash:{hash(str(message))}"


def sort_task_messages(messages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Return messages oldest-first with deterministic tie-breaking."""
    indexed = list(enumerate(messages))

    def sort_key(item: tuple[int, dict[str, Any]]) -> tuple[float, int]:
        _, msg = item
        ts = _parse_timestamp(msg.get("created_at") or msg.get("timestamp"))
        # When timestamps tie, preserve source order reversed (Agentex batches are newest-first).
        return (ts, -item[0])

    indexed.sort(key=sort_key)
    return [msg for _, msg in indexed]


def dedupe_task_messages(messages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[str] = set()
    out: list[dict[str, Any]] = []
    for msg in messages:
        key = message_key(msg)
        if key in seen:
            continue
        seen.add(key)
        out.append(msg)
    return out


def normalize_task_messages(messages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return sort_task_messages(dedupe_task_messages(messages))


def new_messages_since(
    messages: list[dict[str, Any]],
    seen_keys: set[str],
) -> list[dict[str, Any]]:
    """Return unseen messages in chronological order."""
    normalized = normalize_task_messages(messages)
    fresh: list[dict[str, Any]] = []
    for msg in normalized:
        key = message_key(msg)
        if key in seen_keys:
            continue
        seen_keys.add(key)
        fresh.append(msg)
    return fresh
