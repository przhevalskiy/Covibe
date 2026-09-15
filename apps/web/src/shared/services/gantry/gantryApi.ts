import {
  AttachmentDetail,
  AttachmentSummary,
  Discussion,
  DiscussionCreate,
  DiscussionUpdate,
  Message,
  MessageRole,
  Project,
  ProjectCreate,
  ProjectFile,
  ProjectUpdate,
  Template,
  TemplateCreate,
  TemplateUpdate,
} from '@/shared/types';
import { gantryClient } from './client';
import { discussionLocal } from './discussionLocal';
import { templateLocal } from './templateLocal';
import { toUiWorkspace, migrateLocalNotesIfNeeded } from './projectMapper';

/** UI-shaped API surface backed by Gantry /v1 + local stores (M2). */
export class GantryApiService {
  async healthCheck() {
    const health = await gantryClient.health();
    return { status: health.status, providers: { gantry: true } };
  }

  async getDiscussions(): Promise<Discussion[]> {
    return discussionLocal.list();
  }

  async getDiscussion(id: string): Promise<Discussion> {
    const row = discussionLocal.get(id);
    if (!row) throw new Error('discussion not found');
    return row;
  }

  async createDiscussion(data?: DiscussionCreate): Promise<Discussion> {
    return discussionLocal.create(data);
  }

  async updateDiscussion(id: string, data: DiscussionUpdate): Promise<Discussion> {
    return discussionLocal.update(id, data);
  }

  async deleteDiscussion(id: string): Promise<void> {
    discussionLocal.delete(id);
  }

  async deleteAllDiscussions(): Promise<{ status: string; count: number }> {
    const count = discussionLocal.deleteAll();
    return { status: 'ok', count };
  }

  async activateDiscussion(id: string): Promise<Discussion> {
    return discussionLocal.update(id, { is_active: true });
  }

  async addMessage(discussionId: string, content: string, role: MessageRole): Promise<Message> {
    return discussionLocal.addMessage(discussionId, content, role);
  }

  async getWorkspaces(): Promise<Project[]> {
    const rows = await gantryClient.listWorkspaces();
    const migrated = await Promise.all(
      rows.map((row) =>
        migrateLocalNotesIfNeeded(row, async (id, instructions) => {
          await gantryClient.updateWorkspace(id, { instructions });
        }),
      ),
    );
    return migrated.map(toUiWorkspace);
  }

  /** @deprecated Use getWorkspaces */
  async getProjects(): Promise<Project[]> {
    return this.getWorkspaces();
  }

  async getWorkspace(id: string): Promise<Project> {
    try {
      let row = await gantryClient.getWorkspace(id);
      row = await migrateLocalNotesIfNeeded(row, async (pid, instructions) => {
        await gantryClient.updateWorkspace(pid, { instructions });
      });
      return toUiWorkspace(row);
    } catch {
      const workspaces = await this.getWorkspaces();
      const row = workspaces.find(w => w.id === id);
      if (!row) throw new Error('workspace not found');
      return row;
    }
  }

  /** @deprecated Use getWorkspace */
  async getProject(id: string): Promise<Project> {
    return this.getWorkspace(id);
  }

  async createWorkspace(data: ProjectCreate): Promise<Project> {
    const row = await gantryClient.createWorkspace(data.name, {
      github_url: data.github_url ?? undefined,
      instructions: data.instructions ?? undefined,
    });
    return toUiWorkspace(row);
  }

  /** @deprecated Use createWorkspace */
  async createProject(data: ProjectCreate): Promise<Project> {
    return this.createWorkspace(data);
  }

  async updateWorkspace(id: string, data: ProjectUpdate): Promise<Project> {
    const row = await gantryClient.updateWorkspace(id, {
      name: data.name,
      github_url: data.github_url ?? undefined,
      instructions: data.instructions ?? undefined,
    });
    return toUiWorkspace(row);
  }

  /** @deprecated Use updateWorkspace */
  async updateProject(id: string, data: ProjectUpdate): Promise<Project> {
    return this.updateWorkspace(id, data);
  }

  async deleteWorkspace(id: string): Promise<void> {
    await gantryClient.deleteWorkspace(id);
  }

  /** @deprecated Use deleteWorkspace */
  async deleteProject(id: string): Promise<void> {
    return this.deleteWorkspace(id);
  }

  async getWorkspaceDiscussions(id: string): Promise<Discussion[]> {
    return discussionLocal.list().filter(d => d.project_id === id);
  }

  /** @deprecated Use getWorkspaceDiscussions */
  async getProjectDiscussions(id: string): Promise<Discussion[]> {
    return this.getWorkspaceDiscussions(id);
  }

  async getProjectFiles(_projectId: string): Promise<ProjectFile[]> {
    return [];
  }

  async uploadProjectFile(_projectId: string, _file: File): Promise<ProjectFile> {
    throw new Error('Project files are not available on Gantry yet');
  }

  async deleteProjectFile(_projectId: string, _fileId: string): Promise<void> {
    /* no-op */
  }

  async getTemplates(): Promise<Template[]> {
    return templateLocal.list();
  }

  async createTemplate(data: TemplateCreate): Promise<Template> {
    return templateLocal.create(data);
  }

  async updateTemplate(id: string, data: TemplateUpdate): Promise<Template> {
    return templateLocal.update(id, data);
  }

  async deleteTemplate(id: string): Promise<void> {
    templateLocal.delete(id);
  }

  getStreamUrl(): string {
    return '';
  }

  async uploadAttachment(_discussionId: string, _file: File): Promise<AttachmentSummary> {
    throw new Error('Attachments are not available on Gantry yet');
  }

  async getAttachments(_discussionId: string): Promise<AttachmentSummary[]> {
    return [];
  }

  async getAttachmentDetail(_discussionId: string, _attachmentId: string): Promise<AttachmentDetail> {
    throw new Error('Attachments are not available on Gantry yet');
  }

  async deleteAttachment(_discussionId: string, _attachmentId: string): Promise<void> {
    /* no-op */
  }
}

export const gantryApiService = new GantryApiService();
