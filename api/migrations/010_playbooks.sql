-- Org-scoped playbooks (Skills) — config overlays, not hardcoded verticals
-- Idempotent — safe to re-run via scripts/migrate_db.py

CREATE TABLE IF NOT EXISTS playbooks (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    slug              TEXT NOT NULL,
    label             TEXT NOT NULL,
    description       TEXT,
    config            JSONB NOT NULL DEFAULT '{}'::jsonb,
    workspace_id      UUID REFERENCES projects(id) ON DELETE SET NULL,
    is_system         BOOLEAN NOT NULL DEFAULT false,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (org_id, slug)
);

CREATE INDEX IF NOT EXISTS playbooks_org_id ON playbooks(org_id);
CREATE INDEX IF NOT EXISTS playbooks_workspace_id ON playbooks(workspace_id) WHERE workspace_id IS NOT NULL;

-- Seed built-in examples for the default org (forkable, editable labels — not deletable via API)
INSERT INTO playbooks (org_id, slug, label, description, config, is_system)
VALUES
(
    '00000000-0000-4000-8000-000000000001',
    'platform-backlog',
    'Platform backlog',
    'Small scoped backlog changes — light tier, single track.',
    '{"vertical":"V-PLAT","tier_default":1,"branch_prefix":"backlog","goal_prefix":"Small scoped change suitable for backlog drain: ","pipeline":{"max_heal_cycles":1,"max_parallel_tracks":1}}'::jsonb,
    true
),
(
    '00000000-0000-4000-8000-000000000001',
    'a11y-remediation',
    'A11y remediation',
    'WCAG-oriented fixes with extra accessibility oracle checks.',
    '{"vertical":"V-A11Y","tier_default":2,"branch_prefix":"a11y","goal_prefix":"WCAG 2.1 AA remediation — ","pipeline":{"max_heal_cycles":2,"max_parallel_tracks":2},"oracle":{"inspector_overlay":"ACCESSIBILITY ORACLE (V-A11Y):\nAfter standard test/lint/type checks, run accessibility verification:\n1. Prefer project-configured a11y lint (eslint-plugin-jsx-a11y) via run_lint.\n2. If package.json lists pa11y-ci or @axe-core/cli, run it via run_tests.\n3. Treat WCAG 2.1 AA violations as heal_items with severity=high.\n4. Do NOT mark passed=True until a11y checks pass or are explicitly skipped (missing tooling only — note in summary).\n","qa_commands":{"a11y":"npx eslint src --ext .tsx,.jsx --max-warnings 0"}}}'::jsonb,
    true
),
(
    '00000000-0000-4000-8000-000000000001',
    'monorepo-slice',
    'Monorepo slice',
    'Package-boundary parallel tracks for monorepos.',
    '{"vertical":"V-MONO","tier_default":2,"branch_prefix":"slice","goal_prefix":"Monorepo package-boundary slice — ","pipeline":{"max_heal_cycles":2,"max_parallel_tracks":3},"architect_overlay":"MONOREPO SLICE RULES (V-MONO):\n- Identify package boundaries (packages/*, apps/*, libs/*, modules/*).\n- Each parallel track MUST own files within ONE package only.\n- Use depends_on when a track needs exports from another package.\n- NEVER assign the same file to two parallel tracks in the same wave.\n- Prefer 2-3 tracks scoped to distinct packages over one mega-track.\n"}'::jsonb,
    true
)
ON CONFLICT (org_id, slug) DO NOTHING;
