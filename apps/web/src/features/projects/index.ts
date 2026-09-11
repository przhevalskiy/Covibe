/** Workspace catalog (API: /v1/workspaces). */
export {
  useWorkspaceCatalogStore,
  useWorkspaceCatalogStore as useProjectStore,
} from './store';
export { WorkspacesPage } from './components/ProjectsPage';
export { WorkspaceDetailPage } from './components/ProjectDetailPage';
export { CreateWorkspaceModal } from './components/CreateProjectModal';
/** @deprecated Use WorkspacesPage */
export { WorkspacesPage as ProjectsPage } from './components/ProjectsPage';
/** @deprecated Use WorkspaceDetailPage */
export { WorkspaceDetailPage as ProjectDetailPage } from './components/ProjectDetailPage';
/** @deprecated Use CreateWorkspaceModal */
export { CreateWorkspaceModal as CreateProjectModal } from './components/CreateProjectModal';
