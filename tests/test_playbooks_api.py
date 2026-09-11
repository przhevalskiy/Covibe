"""Playbook config validation and spec helpers."""
from __future__ import annotations

import pytest

from schemas.playbooks import SYSTEM_PLAYBOOKS, validate_playbook_config


def test_validate_playbook_config_accepts_minimal():
    validate_playbook_config({"pipeline": {"max_parallel_tracks": 1, "max_heal_cycles": 0}})


def test_validate_playbook_config_rejects_bad_tracks():
    with pytest.raises(ValueError, match="max_parallel_tracks"):
        validate_playbook_config({"pipeline": {"max_parallel_tracks": 0}})


def test_system_playbooks_seed_shape():
    for slug, spec in SYSTEM_PLAYBOOKS.items():
        config = {k: v for k, v in spec.items() if k != "label"}
        validate_playbook_config(config)
        assert slug in spec.get("label", slug) or spec.get("label")
