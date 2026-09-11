export type TaskStructuredResult = {
  result?: { pr_url?: string; branch?: string } | null;
};

/** Structured PR URL only — no message scraping (I3 invariant). */
export function resolveTaskPrUrl(task: TaskStructuredResult | null | undefined): string | null {
  const url = task?.result?.pr_url;
  if (typeof url === 'string' && url.trim()) return url.trim();
  return null;
}

/** Structured branch only — no message scraping. */
export function resolveTaskBranch(task: TaskStructuredResult | null | undefined): string | null {
  const branch = task?.result?.branch;
  if (typeof branch === 'string' && branch.trim()) return branch.trim();
  return null;
}
