import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(override=False)

GANTRY_API_PORT: int = int(os.getenv("GANTRY_API_PORT", "8001"))
AGENTEX_BASE_URL: str = os.getenv("AGENTEX_BASE_URL", "http://localhost:5003")
GANTRY_WEB_URL: str = os.getenv(
    "GANTRY_WEB_URL",
    os.getenv("GANTRY_UI_URL", "http://localhost:5173"),
)
GANTRY_UI_URL: str = GANTRY_WEB_URL  # backward compat
TEMPORAL_ADDRESS: str = os.getenv("TEMPORAL_ADDRESS", "localhost:7233")
TEMPORAL_NAMESPACE: str = os.getenv("TEMPORAL_NAMESPACE", "default")
# Factory agent for task submit (distinct from worker AGENT_NAME in .env)
GANTRY_AGENT_NAME: str = os.getenv("GANTRY_AGENT_NAME", "swarm-factory")
AGENT_NAME: str = GANTRY_AGENT_NAME

# Webhook signing secret — generated once, stored in ~/.gantry/webhook_secret
GANTRY_HOME: Path = Path(os.getenv("GANTRY_HOME", str(Path.home() / ".gantry")))
KEYS_PATH: Path = GANTRY_HOME / "api_keys.json"
TASKS_PATH: Path = GANTRY_HOME / "api_tasks.json"
AUDIT_PATH: Path = GANTRY_HOME / "audit.jsonl"
WEBHOOK_SECRET_PATH: Path = GANTRY_HOME / "webhook_secret"

GITHUB_WEBHOOK_SECRET: str = os.getenv("GITHUB_WEBHOOK_SECRET", "")
GH_TOKEN: str = os.getenv("GH_TOKEN", os.getenv("GITHUB_TOKEN", ""))

# GitHub App — preferred over PAT-per-task for platform integrations
GITHUB_APP_ID: str = os.getenv("GITHUB_APP_ID", "")
GITHUB_APP_SLUG: str = os.getenv("GITHUB_APP_SLUG", "gantry")
GITHUB_APP_PRIVATE_KEY: str = os.getenv("GITHUB_APP_PRIVATE_KEY", "")
GITHUB_APP_WEBHOOK_SECRET: str = os.getenv("GITHUB_APP_WEBHOOK_SECRET", GITHUB_WEBHOOK_SECRET)
GANTRY_PUBLIC_URL: str = os.getenv("GANTRY_PUBLIC_URL", f"http://localhost:{GANTRY_API_PORT}")

# Postgres — required for multi-user production; optional in local dev
DATABASE_URL: str = os.getenv("DATABASE_URL", "")

# Bootstrap token — required to create the first API key when GANTRY_BOOTSTRAP_TOKEN is set
GANTRY_BOOTSTRAP_TOKEN: str = os.getenv("GANTRY_BOOTSTRAP_TOKEN", "")

# Local dev only — accept unauthenticated /v1 requests with a synthetic org key
GANTRY_DEV_AUTH_BYPASS: bool = os.getenv("GANTRY_DEV_AUTH_BYPASS", "").lower() in (
    "1",
    "true",
    "yes",
)

GANTRY_INSTALL_STATE_SECRET: str = os.getenv(
    "GANTRY_INSTALL_STATE_SECRET",
    os.getenv("GANTRY_BOOTSTRAP_TOKEN", ""),
)

# Fernet key for org secrets — generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
GANTRY_SECRETS_KEY: str = os.getenv("GANTRY_SECRETS_KEY", "")

# Comma-separated browser origins allowed to call the API (UI on Vercel + previews).
# Supports exact origins and preview wildcards: https://*.vercel.app
# Falls back to GANTRY_WEB_URL when unset. Local dev uses localhost when bypass is on.
GANTRY_CORS_ORIGINS: str = os.getenv("GANTRY_CORS_ORIGINS", "")

# Clerk — required for auth in production
CLERK_SECRET_KEY: str = os.getenv("CLERK_SECRET_KEY", "")


def _parse_cors_entry(entry: str) -> tuple[str | None, str | None]:
    """Return (exact_origin, origin_regex) for one CORS config entry."""
    import re

    item = entry.strip().rstrip("/")
    if not item:
        return None, None

    wildcard = re.match(r"^(https?)://\*\.(.+)$", item)
    if wildcard:
        scheme = wildcard.group(1)
        suffix = re.escape(wildcard.group(2).lstrip("."))
        pattern = rf"{scheme}://[\w.-]+\.{suffix}"
        return None, pattern

    return item, None


def cors_settings() -> tuple[list[str], str | None]:
    """Origins for FastAPI CORSMiddleware."""
    exact: list[str] = []
    patterns: list[str] = []

    raw = GANTRY_CORS_ORIGINS.strip()
    if raw:
        for part in raw.split(","):
            origin, pattern = _parse_cors_entry(part)
            if origin:
                exact.append(origin)
            if pattern:
                patterns.append(pattern)
        if exact or patterns:
            regex = "|".join(f"(?:{p})" for p in patterns) if patterns else None
            return exact, regex

    web = GANTRY_WEB_URL.strip().rstrip("/")
    if web and web not in ("http://localhost:5173", "http://127.0.0.1:5173"):
        return [web], None

    if GANTRY_DEV_AUTH_BYPASS:
        return ["http://localhost:5173", "http://127.0.0.1:5173"], None

    return [], None


def cors_allow_origins() -> list[str]:
    """Backward-compatible helper — exact origins only."""
    exact, _ = cors_settings()
    return exact
