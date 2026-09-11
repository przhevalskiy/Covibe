import { gantryClient } from './client';
import type { SpecAttachment } from '@/features/compose/store';

/** Upload pending specs and return server artifact ids for task submit. */
export async function resolveSubmitArtifactIds(
  projectId: string,
  specs: SpecAttachment[],
): Promise<string[]> {
  const ids: string[] = [];

  for (const spec of specs) {
    if (spec.artifactId) {
      ids.push(spec.artifactId);
      continue;
    }

    const blob = new Blob([spec.text], { type: 'text/plain' });
    const file = new File([blob], spec.filename, { type: 'text/plain' });
    const { artifact } = await gantryClient.uploadArtifact(projectId, file, 'run');
    ids.push(artifact.id);
  }

  return ids;
}
