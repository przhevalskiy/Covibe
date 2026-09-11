import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from '@/app/App'
import { getOpenUxGaps, getDeferredUxGaps } from '@/shared/gantry/uxGaps'
import { useWorkspaceStore } from '@/features/workspace'
import { useWorkspaceCatalogStore } from '@/features/projects'
import { usePlaybookStore } from '@/features/playbooks'

useWorkspaceStore.getState().hydrate()
void Promise.all([
  useWorkspaceCatalogStore.getState().fetchWorkspaces(),
  usePlaybookStore.getState().fetchPlaybooks(),
]).then(() => {
  void useWorkspaceStore.getState().validateActive()
})

if (import.meta.env.DEV) {
  const open = getOpenUxGaps()
  const deferred = getDeferredUxGaps()
  if (open.length) {
    console.info('[Gantry UX] Open alignment gaps:', open.map(g => g.id))
  }
  if (deferred.length) {
    console.info('[Gantry UX] Deferred gaps (documented):', deferred.map(g => g.id))
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
