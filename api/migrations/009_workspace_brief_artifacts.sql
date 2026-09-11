-- Workspace brief (server-backed) + run/workspace artifacts
-- Idempotent — safe to re-run via scripts/migrate_db.py

ALTER TABLE projects ADD COLUMN IF NOT EXISTS instructions TEXT;

CREATE TABLE IF NOT EXISTS artifacts (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id        UUID NOT NULL,
    project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    task_id       TEXT,
    scope         TEXT NOT NULL DEFAULT 'run',
    filename      TEXT NOT NULL,
    content_type  TEXT NOT NULL DEFAULT 'text/plain',
    size_bytes    INT NOT NULL DEFAULT 0,
    storage_path  TEXT NOT NULL,
    text_extract  TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS artifacts_project_id ON artifacts(project_id);
CREATE INDEX IF NOT EXISTS artifacts_org_id ON artifacts(org_id);
CREATE INDEX IF NOT EXISTS artifacts_task_id ON artifacts(task_id) WHERE task_id IS NOT NULL;
