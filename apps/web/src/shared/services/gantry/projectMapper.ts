import type { Workspace } from '@/shared/types';
import type { GantryWorkspace } from './client';

const NOTES_KEY = 'gantry_project_notes_v1';
const NOTES_MIGRATED_KEY = 'gantry_project_notes_migrated_v1';

function loadLegacyNotes(): Record<string, string> {
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

/** One-time push of browser-local notes to server when instructions are empty. */
export async function migrateLocalNotesIfNeeded(
  row: GantryWorkspace,
  updateFn: (id: string, instructions: string) => Promise<void>,
): Promise<GantryWorkspace> {
  if (row.instructions?.trim()) return row;
  if (localStorage.getItem(NOTES_MIGRATED_KEY) === row.id) return row;

  const legacy = loadLegacyNotes()[row.id];
  if (!legacy?.trim()) return row;

  try {
    await updateFn(row.id, legacy.trim());
    localStorage.setItem(NOTES_MIGRATED_KEY, row.id);
    return { ...row, instructions: legacy.trim() };
  } catch {
    return row;
  }
}

export function toUiWorkspace(row: GantryWorkspace): Workspace {
  const created = row.created_at ?? new Date().toISOString();
  const updated = row.updated_at ?? created;
  const legacy = !row.instructions ? loadLegacyNotes()[row.id] : null;
  return {
    id: row.id,
    name: row.name,
    repo_path: row.repo_path ?? null,
    github_url: row.github_url ?? null,
    github_owner: row.github_owner ?? null,
    github_repo: row.github_repo ?? null,
    instructions: row.instructions ?? legacy ?? null,
    created_at: created,
    updated_at: updated,
  };
}

/** @deprecated Use toUiWorkspace */
export const toUiProject = toUiWorkspace;

/** @deprecated Use toUiWorkspace */
export const toQodexProject = toUiWorkspace;
