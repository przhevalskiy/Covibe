import type { ReactNode } from 'react';
import {
  IdeExplorerContext,
  useIdeExplorerState,
  type IdeExplorerProviderProps,
} from './ideExplorerState';

export function IdeExplorerProvider({
  children,
  ...props
}: IdeExplorerProviderProps & { children: ReactNode }) {
  const value = useIdeExplorerState(props);

  return (
    <IdeExplorerContext.Provider value={value}>
      {children}
    </IdeExplorerContext.Provider>
  );
}
