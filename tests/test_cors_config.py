"""CORS configuration for hosted UI (Vercel) → API (VPS)."""
from importlib import reload

import api.config as cfg


def test_cors_from_web_url(monkeypatch):
    monkeypatch.setenv("GANTRY_WEB_URL", "https://app.example.com")
    monkeypatch.delenv("GANTRY_CORS_ORIGINS", raising=False)
    monkeypatch.delenv("GANTRY_DEV_AUTH_BYPASS", raising=False)
    reload(cfg)
    exact, regex = cfg.cors_settings()
    assert exact == ["https://app.example.com"]
    assert regex is None


def test_cors_explicit_origins_and_vercel_wildcard(monkeypatch):
    monkeypatch.setenv(
        "GANTRY_CORS_ORIGINS",
        "https://app.example.com, https://*.vercel.app",
    )
    monkeypatch.delenv("GANTRY_DEV_AUTH_BYPASS", raising=False)
    reload(cfg)
    exact, regex = cfg.cors_settings()
    assert exact == ["https://app.example.com"]
    assert regex is not None
    assert "vercel\\.app" in regex


def test_cors_local_dev_bypass(monkeypatch):
    monkeypatch.delenv("GANTRY_CORS_ORIGINS", raising=False)
    monkeypatch.delenv("GANTRY_WEB_URL", raising=False)
    monkeypatch.setenv("GANTRY_DEV_AUTH_BYPASS", "true")
    reload(cfg)
    exact, regex = cfg.cors_settings()
    assert "http://localhost:5173" in exact
    assert regex is None
