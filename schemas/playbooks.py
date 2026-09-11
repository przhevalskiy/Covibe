"""Playbook registry — config overlays for the engine (M4). No workflow forks.

Built-in SYSTEM_PLAYBOOKS are seeded examples / offline fallbacks.
Org-scoped playbooks live in the DB (see api/repositories/playbooks.py).
"""
from __future__ import annotations

from copy import deepcopy
from typing import Any

# Built-in examples — seeded to DB on first access; also used when DB is offline.
SYSTEM_PLAYBOOKS: dict[str, dict[str, Any]] = {
    "platform-backlog": {
        "label": "Platform backlog",
        "vertical": "V-PLAT",
        "tier_default": 1,
        "branch_prefix": "backlog",
        "goal_prefix": "Small scoped change suitable for backlog drain: ",
        "pipeline": {
            "max_heal_cycles": 1,
            "max_parallel_tracks": 1,
        },
    },
    "a11y-remediation": {
        "label": "A11y remediation",
        "vertical": "V-A11Y",
        "tier_default": 2,
        "branch_prefix": "a11y",
        "goal_prefix": "WCAG 2.1 AA remediation — ",
        "pipeline": {
            "max_heal_cycles": 2,
            "max_parallel_tracks": 2,
        },
        "oracle": {
            "inspector_overlay": (
                "ACCESSIBILITY ORACLE (V-A11Y):\n"
                "After standard test/lint/type checks, run accessibility verification:\n"
                "1. Prefer project-configured a11y lint (eslint-plugin-jsx-a11y) via run_lint.\n"
                "2. If package.json lists pa11y-ci or @axe-core/cli, run it via run_tests.\n"
                "3. Treat WCAG 2.1 AA violations as heal_items with severity=high.\n"
                "4. Do NOT mark passed=True until a11y checks pass or are explicitly skipped "
                "(missing tooling only — note in summary).\n"
            ),
            "qa_commands": {
                "a11y": "npx eslint src --ext .tsx,.jsx --max-warnings 0",
            },
        },
    },
    "monorepo-slice": {
        "label": "Monorepo slice",
        "vertical": "V-MONO",
        "tier_default": 2,
        "branch_prefix": "slice",
        "goal_prefix": "Monorepo package-boundary slice — ",
        "pipeline": {
            "max_heal_cycles": 2,
            "max_parallel_tracks": 3,
        },
        "architect_overlay": (
            "MONOREPO SLICE RULES (V-MONO):\n"
            "- Identify package boundaries (packages/*, apps/*, libs/*, modules/*).\n"
            "- Each parallel track MUST own files within ONE package only.\n"
            "- Use depends_on when a track needs exports from another package.\n"
            "- NEVER assign the same file to two parallel tracks in the same wave.\n"
            "- Prefer 2-3 tracks scoped to distinct packages over one mega-track.\n"
        ),
    },
}

# Backward-compatible alias
PLAYBOOKS = SYSTEM_PLAYBOOKS
PLAYBOOK_IDS = frozenset(SYSTEM_PLAYBOOKS)


def spec_from_row(spec: dict[str, Any]) -> dict[str, Any]:
    """Strip label from a full spec for JSONB storage (label is a column in DB)."""
    out = deepcopy(spec)
    out.pop("label", None)
    return out


def validate_playbook_config(config: dict[str, Any]) -> None:
    pipeline = config.get("pipeline") or {}
    if not isinstance(pipeline, dict):
        raise ValueError("pipeline must be an object")
    tracks = pipeline.get("max_parallel_tracks", 1)
    heals = pipeline.get("max_heal_cycles", 0)
    if int(tracks) < 1 or int(tracks) > 8:
        raise ValueError("pipeline.max_parallel_tracks must be 1–8")
    if int(heals) < 0 or int(heals) > 5:
        raise ValueError("pipeline.max_heal_cycles must be 0–5")
    tier = config.get("tier_default", 1)
    if int(tier) < 0 or int(tier) > 3:
        raise ValueError("tier_default must be 0–3")


def _resolve_spec(playbook_id: str | None, playbook_spec: dict[str, Any] | None) -> dict[str, Any] | None:
    if playbook_spec:
        return deepcopy(playbook_spec)
    if not playbook_id:
        return None
    row = SYSTEM_PLAYBOOKS.get(playbook_id)
    return deepcopy(row) if row else None


def get_playbook(playbook_id: str | None, playbook_spec: dict[str, Any] | None = None) -> dict[str, Any] | None:
    spec = _resolve_spec(playbook_id, playbook_spec)
    return dict(spec) if spec else None


def resolve_submit_params(
    *,
    goal: str,
    branch_prefix: str,
    tier: int,
    playbook_id: str | None,
    pipeline: dict[str, Any] | None,
    playbook_spec: dict[str, Any] | None = None,
) -> tuple[str, str, int, dict[str, Any] | None, str | None]:
    """Merge playbook defaults into submit params. Returns (goal, branch_prefix, tier, pipeline, playbook_id)."""
    spec = _resolve_spec(playbook_id, playbook_spec)
    if playbook_id and not spec:
        raise ValueError(f"unknown playbook: {playbook_id}")
    if not spec:
        return goal, branch_prefix, tier, pipeline, None

    merged_goal = goal
    prefix = spec.get("goal_prefix", "")
    if prefix and not goal.lower().startswith(prefix.lower()[: min(20, len(prefix))]):
        merged_goal = f"{prefix}{goal}"

    merged_branch = spec.get("branch_prefix") or branch_prefix
    merged_tier = tier if tier >= 0 else int(spec.get("tier_default", tier))

    merged_pipeline: dict[str, Any] = dict(spec.get("pipeline") or {})
    if pipeline:
        merged_pipeline.update(pipeline)

    resolved_id = playbook_id or spec.get("slug") or spec.get("label")
    return merged_goal, merged_branch, merged_tier, merged_pipeline or None, resolved_id


def architect_prompt_overlay(
    playbook_id: str | None,
    playbook_spec: dict[str, Any] | None = None,
) -> str | None:
    spec = _resolve_spec(playbook_id, playbook_spec)
    if not spec:
        return None
    overlay = spec.get("architect_overlay")
    return str(overlay).strip() if overlay else None


def inspector_prompt_overlay(
    playbook_id: str | None,
    playbook_spec: dict[str, Any] | None = None,
) -> str | None:
    spec = _resolve_spec(playbook_id, playbook_spec)
    if not spec:
        return None
    oracle = spec.get("oracle") or {}
    overlay = oracle.get("inspector_overlay")
    if overlay:
        return str(overlay).strip()
    # DB config may store inspector_overlay at top level
    top = spec.get("inspector_overlay")
    return str(top).strip() if top else None


def playbook_oracle_qa_commands(
    playbook_id: str | None,
    playbook_spec: dict[str, Any] | None = None,
) -> dict[str, str]:
    spec = _resolve_spec(playbook_id, playbook_spec)
    if not spec:
        return {}
    oracle = spec.get("oracle") or {}
    raw = oracle.get("qa_commands") or spec.get("qa_commands") or {}
    return {str(k): str(v) for k, v in raw.items()}
