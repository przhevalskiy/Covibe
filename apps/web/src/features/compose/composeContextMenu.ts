export type ComposeContextMenuView = 'root' | 'workspaces' | 'starters' | 'profile';

export function openComposeContextMenu(view: ComposeContextMenuView = 'root') {
  window.dispatchEvent(
    new CustomEvent('gantry:open-compose-menu', { detail: { view } }),
  );
}
