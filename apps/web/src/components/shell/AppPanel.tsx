import type { ReactNode } from 'react';
import './AppPanel.css';

/** Inset main canvas — all routed pages render inside this shell panel. */
export function AppPanel({ children }: { children: ReactNode }) {
  return (
    <div className="app-panel">
      <div className="app-panel-inner">{children}</div>
    </div>
  );
}
