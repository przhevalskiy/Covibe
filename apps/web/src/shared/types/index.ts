export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  content: string;
  role: MessageRole;
  timestamp: string;
  tokens_used?: number;
  response_time_ms?: number;
  intent?: string;
}

export interface Discussion {
  id: string;
  title: string;
  project_id?: string | null;
  task_id?: string | null;
  messages: Message[];
  is_active: boolean;
  intent?: string;
  created_at: string;
  updated_at: string;
}

export interface DiscussionCreate {
  title?: string;
  project_id?: string | null;
}

export interface DiscussionUpdate {
  title?: string;
  is_active?: boolean;
  intent?: string;
  project_id?: string | null;
}

/** Workspace — canonical domain term (API: /v1/workspaces, DB: projects). */
export interface Workspace {
  id: string;
  name: string;
  repo_path?: string | null;
  github_url?: string | null;
  github_owner?: string | null;
  github_repo?: string | null;
  instructions?: string | null;
  locked_intent?: string | null;
  locked_service_type?: string | null;
  icon?: string | null;
  color?: string | null;
  parent_workspace_id?: string | null;
  /** @deprecated DB field name — use parent_workspace_id in new code */
  parent_project_id?: string | null;
  created_at: string;
  updated_at: string;
}

/** @deprecated Use Workspace */
export type Project = Workspace;

export interface WorkspaceCreate {
  name: string;
  github_url?: string | null;
  instructions?: string | null;
  locked_intent?: string | null;
  locked_service_type?: string | null;
  icon?: string | null;
  color?: string | null;
  parent_workspace_id?: string | null;
}

/** @deprecated Use WorkspaceCreate */
export type ProjectCreate = WorkspaceCreate;

export interface WorkspaceUpdate {
  name?: string;
  github_url?: string | null;
  instructions?: string | null;
  locked_intent?: string | null;
  locked_service_type?: string | null;
  icon?: string | null;
  color?: string | null;
  parent_workspace_id?: string | null;
}

/** @deprecated Use WorkspaceUpdate */
export type ProjectUpdate = WorkspaceUpdate;

export interface ProjectFile {
  id: string;
  project_id: string;
  filename: string;
  content_type?: string | null;
  size_bytes?: number | null;
  created_at: string;
}

export interface Template {
  id: string;
  name: string;
  description?: string | null;
  body: string;
  workspace_id?: string | null;
  /** @deprecated Use workspace_id */
  hubspace_id?: string | null;
  icon?: string | null;
  color?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TemplateCreate {
  name: string;
  description?: string | null;
  body: string;
  workspace_id?: string | null;
  /** @deprecated Use workspace_id */
  hubspace_id?: string | null;
  icon?: string | null;
  color?: string | null;
}

/** Playbook / Skill — org-scoped run config overlay (API: /v1/playbooks). */
export interface PlaybookConfig {
  vertical?: string | null;
  tier_default?: number;
  branch_prefix?: string;
  goal_prefix?: string;
  pipeline?: {
    max_parallel_tracks?: number;
    max_heal_cycles?: number;
  };
  architect_overlay?: string | null;
  inspector_overlay?: string | null;
  qa_commands?: Record<string, string>;
  oracle?: {
    inspector_overlay?: string;
    qa_commands?: Record<string, string>;
  };
}

export interface Playbook {
  id: string;
  org_id: string;
  slug: string;
  label: string;
  description?: string | null;
  config: PlaybookConfig;
  workspace_id?: string | null;
  is_system?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface PlaybookCreate {
  label: string;
  slug?: string | null;
  description?: string | null;
  workspace_id?: string | null;
  config: PlaybookConfig;
}

export interface TemplateUpdate {
  name?: string;
  description?: string | null;
  body?: string;
  workspace_id?: string | null;
  /** @deprecated Use workspace_id */
  hubspace_id?: string | null;
  icon?: string | null;
  color?: string | null;
}

export interface ChatRequest {
  discussion_id: string;
  message: string;
  /** Hubspace override from run composer (Gantry). */
  project_id?: string | null;
  temperature?: number;
  max_tokens?: number;
}

// SSE Event types
export interface SSEChunkEvent {
  type: 'chunk';
  content: string;
  provider: string;
}

export interface SSEDoneEvent {
  type: 'done';
  provider: string;
}

export interface SSEErrorEvent {
  type: 'error';
  error: string;
  provider: string;
}

export interface SSEDiscussionTitleEvent {
  type: 'discussion_title';
  discussion_id: string;
  title: string;
}

export interface SSEIntentEvent {
  type: 'intent';
  intent: string;
  label: string;
}

export interface SSEChecklistEvent {
  type: 'checklist';
  fields: Record<string, string>;
  intent: string;
}

export interface SSETaskMessageEvent {
  type: 'task_message';
  message: Record<string, unknown>;
  provider: string;
}

export interface SSESubmittedEvent {
  type: 'submitted';
  /** Canonical Gantry task id after POST /v1/tasks. */
  task_id: string;
  /** @deprecated Legacy alias — prefer task_id. */
  hive_task_id?: string;
  message: string;
}

export type SSEEvent =
  | SSEChunkEvent
  | SSETaskMessageEvent
  | SSEDiscussionTitleEvent
  | SSEIntentEvent
  | SSEChecklistEvent
  | SSESubmittedEvent
  | SSEDoneEvent
  | SSEErrorEvent;

// Attachment types (conversation-scoped files)
export interface AttachmentSummary {
  id: string;
  discussion_id: string;
  filename: string;
  file_content_type: string;
  file_size: number;
  chunk_count: number;
  created_at: string;
  is_image?: boolean;
}

export interface AttachmentChunk {
  id: string;
  content: string;
  chunk_index: number;
  content_type: string;
}

export interface AttachmentDetail {
  id: string;
  discussion_id: string;
  filename: string;
  file_content_type: string;
  file_size: number;
  chunk_count: number;
  created_at: string;
  is_image?: boolean;
  image_data?: string;
  full_text: string;
  chunks: AttachmentChunk[];
}

export interface ApiError {
  detail: string;
}

export interface HealthResponse {
  status: string;
  providers: Record<string, boolean>;
}
