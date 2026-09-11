import { ChatRequest, SSEEvent } from '../types';
import { gantryClient, type PipelineConfig } from './gantry/client';
import { playbookLabel, runSizeLabel } from '@/shared/constants/runConfig';
import { getPipelineDefaults, pipelinePayload } from './gantry/pipelineDefaults';
import { getGithubToken } from './gantry/userSettings';
import { discussionLocal } from './gantry/discussionLocal';
import { resolveSubmitProjectId, saveActiveWorkspaceId } from './gantry/greenfieldWorkspace';
import { resolveSubmitArtifactIds } from './gantry/resolveSubmitArtifacts';
import { streamGantryTask } from './gantry/gantryStream';
import { useRunComposeStore } from '@/features/compose/store';

export class SSEClient {
  private abortController: AbortController | null = null;

  async *streamChat(request: ChatRequest): AsyncGenerator<SSEEvent, void, unknown> {
    this.cancel();
    this.abortController = new AbortController();

    try {
      const discussion = discussionLocal.get(request.discussion_id);
      const preferredProjectId = request.project_id ?? discussion?.project_id ?? null;
      const projectId = await resolveSubmitProjectId(preferredProjectId, request.message);
      saveActiveWorkspaceId(projectId);
      window.dispatchEvent(
        new CustomEvent('gantry:workspace-changed', { detail: { workspace_id: projectId } }),
      );
      if (projectId !== preferredProjectId) {
        discussionLocal.update(request.discussion_id, { project_id: projectId });
      }

      yield {
        type: 'intent',
        intent: 'factory_run',
        label: 'Factory run',
      };

      const defaults = getPipelineDefaults();
      const pipeline = pipelinePayload(defaults);
      const playbook = defaults.playbook || undefined;
      const specs = useRunComposeStore.getState().specs;
      const artifactIds = specs.length
        ? await resolveSubmitArtifactIds(projectId, specs)
        : [];

      const { task_id } = await gantryClient.submitTask({
        goal: request.message,
        workspace_id: projectId,
        tier: defaults.tier,
        include_workspace_brief: true,
        ...(artifactIds.length ? { artifact_ids: artifactIds } : {}),
        ...(playbook ? { playbook } : {}),
        ...(pipeline ? { pipeline: pipeline as PipelineConfig } : {}),
        ...(getGithubToken() ? { github_token: getGithubToken() } : {}),
      });

      discussionLocal.setTaskId(request.discussion_id, task_id);
      window.dispatchEvent(
        new CustomEvent('gantry:task-submitted', {
          detail: { task_id, discussion_id: request.discussion_id, workspace_id: projectId },
        }),
      );

      const profileParts = [
        runSizeLabel(defaults.tier),
        playbook ? playbookLabel(playbook) : null,
      ].filter(Boolean);

      yield {
        type: 'submitted',
        task_id,
        hive_task_id: task_id,
        message: `Run started (${profileParts.join(' · ')}) — task ${task_id}`,
      };

      yield* streamGantryTask(task_id);
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return;
      }
      yield {
        type: 'error',
        error: (error as Error).message,
        provider: 'gantry',
      };
    }
  }

  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  isActive(): boolean {
    return this.abortController !== null && !this.abortController.signal.aborted;
  }
}

export const sseClient = new SSEClient();
